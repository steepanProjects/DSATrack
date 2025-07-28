import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertStudentSchema, insertProblemSchema } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { seedDatabase } from "./seed";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Check if we need to seed the database
  app.get("/api/seed-check", async (req, res) => {
    try {
      const problems = await storage.getAllProblems();
      if (problems.length === 0) {
        await seedDatabase();
        res.json({ message: "Database seeded successfully" });
      } else {
        res.json({ message: "Database already seeded" });
      }
    } catch (error) {
      console.error("Seeding error:", error);
      res.status(500).json({ message: "Failed to seed database" });
    }
  });

  // Problems routes
  app.get("/api/problems", async (req, res) => {
    try {
      const problems = await storage.getAllProblems();
      res.json(problems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch problems" });
    }
  });

  app.get("/api/problems/:id", async (req, res) => {
    try {
      const problem = await storage.getProblem(parseInt(req.params.id));
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      res.json(problem);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch problem" });
    }
  });

  // Student progress routes
  app.get("/api/student/:reg_no/progress", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const progress = await storage.getStudentProgressWithAllProblems(req.params.reg_no);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.get("/api/student/:reg_no/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const stats = await storage.getProgressStats(req.params.reg_no);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.put("/api/student/:reg_no/progress/:problem_id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { status } = req.body;
      if (!['not_started', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const progress = await storage.updateProgress(
        req.params.reg_no,
        parseInt(req.params.problem_id),
        status
      );
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Notes routes
  app.get("/api/student/:reg_no/notes/:problem_id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const note = await storage.getStudentNotes(
        req.params.reg_no,
        parseInt(req.params.problem_id)
      );
      res.json(note || { note: "" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch note" });
    }
  });

  app.post("/api/student/:reg_no/notes/:problem_id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { note } = req.body;
      if (!note || note.trim() === "") {
        await storage.deleteNote(req.params.reg_no, parseInt(req.params.problem_id));
        return res.json({ message: "Note deleted" });
      }

      const savedNote = await storage.saveNote(
        req.params.reg_no,
        parseInt(req.params.problem_id),
        note
      );
      res.json(savedNote);
    } catch (error) {
      res.status(500).json({ message: "Failed to save note" });
    }
  });

  // Bookmarks routes
  app.get("/api/student/:reg_no/bookmarks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const bookmarks = await storage.getStudentBookmarks(req.params.reg_no);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });

  app.post("/api/student/:reg_no/bookmarks/:problem_id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const isBookmarked = await storage.toggleBookmark(
        req.params.reg_no,
        parseInt(req.params.problem_id)
      );
      res.json({ bookmarked: isBookmarked });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle bookmark" });
    }
  });

  // Admin routes
  app.get("/api/admin/students", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.type !== 'admin') {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const students = await storage.getAllStudentsProgress();
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post("/api/admin/students", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.type !== 'admin') {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const validatedData = insertStudentSchema.parse(req.body);
      const hashedPassword = await hashPassword(validatedData.password);
      
      const student = await storage.createStudent({
        ...validatedData,
        password_hash: hashedPassword
      });
      res.status(201).json(student);
    } catch (error) {
      res.status(400).json({ message: "Failed to create student" });
    }
  });

  app.put("/api/admin/students/:reg_no/reset-password", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.type !== 'admin') {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const hashedPassword = await hashPassword("12345678");
      await storage.updateStudent(req.params.reg_no, { password_hash: hashedPassword });
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.put("/api/admin/students/:reg_no", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.type !== 'admin') {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { name, department, password } = req.body;
      const updateData: any = { name, department };
      
      if (password && password.length >= 8) {
        updateData.password = password;
      }
      
      const updatedStudent = await storage.updateStudentByAdmin(req.params.reg_no, updateData);
      res.json(updatedStudent);
    } catch (error) {
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/admin/students/:reg_no", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.type !== 'admin') {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      await storage.deleteStudent(req.params.reg_no);
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  app.get("/api/admin/export-csv", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.type !== 'admin') {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const students = await storage.getAllStudentsProgress();
      
      // Generate CSV
      const headers = ["Name", "Registration", "Department", "Completed", "In Progress", "Not Started", "Total", "Percentage"];
      const csvRows = [headers.join(",")];
      
      students.forEach(student => {
        const percentage = Math.round((student.completed / student.total) * 100);
        const row = [
          `"${student.name}"`,
          student.reg_no,
          student.department,
          student.completed,
          student.in_progress,
          student.not_started,
          student.total,
          `${percentage}%`
        ];
        csvRows.push(row.join(","));
      });

      const csvContent = csvRows.join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=student-progress.csv");
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  app.post("/api/admin/upload-students-csv", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.type !== 'admin') {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { csvData } = req.body;
      const rows = csvData.split('\n').slice(1); // Skip header
      let importedCount = 0;

      for (const row of rows) {
        if (row.trim()) {
          const [reg_no, name, department, password] = row.split(',').map(field => field.trim().replace(/"/g, ''));
          if (reg_no && name && department && password) {
            const hashedPassword = await hashPassword(password);
            try {
              await storage.createStudent({
                reg_no,
                name,
                department,
                password_hash: hashedPassword
              });
              importedCount++;
            } catch (error) {
              // Student already exists, skip
            }
          }
        }
      }

      res.json({ message: `Successfully imported ${importedCount} students` });
    } catch (error) {
      res.status(500).json({ message: "Failed to import students" });
    }
  });

  app.post("/api/admin/upload-progress-csv", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.type !== 'admin') {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { csvData } = req.body;
      const rows = csvData.split('\n').slice(1); // Skip header
      let importedCount = 0;

      for (const row of rows) {
        if (row.trim()) {
          const [reg_no, problem_id, status] = row.split(',').map(field => field.trim().replace(/"/g, ''));
          if (reg_no && problem_id && status) {
            try {
              await storage.updateProgress(reg_no, parseInt(problem_id), status as any);
              importedCount++;
            } catch (error) {
              // Progress update failed, skip
            }
          }
        }
      }

      res.json({ message: `Successfully imported ${importedCount} progress records` });
    } catch (error) {
      res.status(500).json({ message: "Failed to import progress data" });
    }
  });

  app.get("/api/admin/analytics/difficulty-progress", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any)?.type !== 'admin') {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const difficultyProgress = await storage.getGlobalDifficultyProgress();
      res.json(difficultyProgress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch difficulty progress" });
    }
  });

  // Student-specific routes for password change, goals, and export
  app.put("/api/student/:reg_no/password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (user.type !== 'student' || user.reg_no !== req.params.reg_no) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      const isValid = await storage.verifyStudentPassword(req.params.reg_no, currentPassword);
      
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      await storage.updateStudentPassword(req.params.reg_no, newPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.post("/api/student/:reg_no/goals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (user.type !== 'student' || user.reg_no !== req.params.reg_no) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const { type, target, category, difficulty, reminder = false, notes, priority = "medium" } = req.body;
      const goal = await storage.setEnhancedStudentGoal(
        req.params.reg_no, 
        type, 
        target, 
        category || null, 
        difficulty || null, 
        reminder ? 1 : 0, 
        notes || null, 
        priority
      );
      res.json(goal);
    } catch (error) {
      res.status(500).json({ message: "Failed to set goal" });
    }
  });

  app.get("/api/student/:reg_no/goals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (user.type !== 'student' || user.reg_no !== req.params.reg_no) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const goals = await storage.getStudentGoals(req.params.reg_no);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.get("/api/student/:reg_no/today-progress", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (user.type !== 'student' || user.reg_no !== req.params.reg_no) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const progress = await storage.getTodayProgress(req.params.reg_no);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's progress" });
    }
  });

  app.get("/api/student/:reg_no/week-progress", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (user.type !== 'student' || user.reg_no !== req.params.reg_no) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const progress = await storage.getWeekProgress(req.params.reg_no);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch week's progress" });
    }
  });

  app.get("/api/student/:reg_no/export-solved", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    if (user.type !== 'student' || user.reg_no !== req.params.reg_no) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const solvedProblems = await storage.getSolvedProblems(req.params.reg_no);
      
      // Generate CSV
      const headers = ["Problem ID", "Title", "Category", "Difficulty", "Status", "Date Completed"];
      const csvRows = [headers.join(",")];
      
      solvedProblems.forEach((item: any) => {
        const row = [
          item.problem.id,
          `"${item.problem.title}"`,
          item.problem.category,
          item.problem.difficulty,
          item.status,
          new Date().toISOString().split('T')[0] // Use current date as placeholder
        ];
        csvRows.push(row.join(","));
      });

      const csvContent = csvRows.join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${req.params.reg_no}_solved_problems.csv`);
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export solved problems" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
