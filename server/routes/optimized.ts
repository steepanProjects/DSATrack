import type { Express } from "express";
import { storage } from "../storage";

// Combined endpoint for student dashboard - reduces multiple API calls to one
export function registerOptimizedRoutes(app: Express) {
  // Combined student dashboard data - single API call for all dashboard needs
  app.get("/api/student/:reg_no/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (user.type !== 'student' || user.reg_no !== req.params.reg_no) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      // Fetch all dashboard data in parallel
      const [
        stats,
        progress,
        problems,
        bookmarks,
        goals,
        todayProgress,
        weekProgress
      ] = await Promise.all([
        storage.getProgressStats(req.params.reg_no),
        storage.getStudentProgressWithAllProblems(req.params.reg_no),
        storage.getAllProblems(),
        storage.getStudentBookmarks(req.params.reg_no),
        storage.getStudentGoals(req.params.reg_no),
        storage.getTodayProgress(req.params.reg_no),
        storage.getWeekProgress(req.params.reg_no)
      ]);

      res.json({
        stats,
        progress,
        problems,
        bookmarks,
        goals,
        todayProgress,
        weekProgress
      });
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Combined admin dashboard data
  app.get("/api/admin/dashboard", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.type !== 'admin') {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const [
        students,
        problems,
        difficultyProgress
      ] = await Promise.all([
        storage.getAllStudentsProgress(),
        storage.getAllProblems(),
        storage.getGlobalDifficultyProgress()
      ]);

      res.json({
        students,
        problems,
        difficultyProgress
      });
    } catch (error) {
      console.error("Admin dashboard fetch error:", error);
      res.status(500).json({ message: "Failed to fetch admin dashboard data" });
    }
  });

  // Batch progress updates - update multiple problems at once
  app.put("/api/student/:reg_no/progress/batch", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (user.type !== 'student' || user.reg_no !== req.params.reg_no) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const { updates } = req.body; // Array of {problem_id, status}
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }

      // Process all updates in parallel
      const updatePromises = updates.map(update => 
        storage.updateProgress(
          req.params.reg_no,
          update.problem_id,
          update.status
        )
      );

      await Promise.all(updatePromises);

      // Return updated stats
      const stats = await storage.getProgressStats(req.params.reg_no);
      res.json({ success: true, stats });
    } catch (error) {
      console.error("Batch update error:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Bulk bookmark operations
  app.put("/api/student/:reg_no/bookmarks/batch", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (user.type !== 'student' || user.reg_no !== req.params.reg_no) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const { problem_ids, action } = req.body; // 'add' or 'remove'
      
      if (!Array.isArray(problem_ids)) {
        return res.status(400).json({ message: "Problem IDs must be an array" });
      }

      // Process all bookmark operations in parallel
      const bookmarkPromises = problem_ids.map(problem_id => 
        storage.toggleBookmark(req.params.reg_no, problem_id)
      );

      await Promise.all(bookmarkPromises);

      // Return updated bookmarks
      const bookmarks = await storage.getStudentBookmarks(req.params.reg_no);
      res.json({ success: true, bookmarks });
    } catch (error) {
      console.error("Batch bookmark error:", error);
      res.status(500).json({ message: "Failed to update bookmarks" });
    }
  });
}