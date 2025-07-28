import { 
  students, 
  admin, 
  problems, 
  student_progress, 
  student_notes, 
  bookmarks,
  student_goals,
  admin_goals,
  student_admin_goals,
  type Student, 
  type Admin,
  type User,
  type InsertStudent, 
  type InsertAdmin,
  type Problem,
  type InsertProblem,
  type StudentProgress,
  type InsertStudentProgress,
  type StudentNotes,
  type InsertStudentNotes,
  type Bookmark,
  type InsertBookmark,
  type StudentGoal,
  type InsertStudentGoal,
  type AdminGoal,
  type InsertAdminGoal,
  type StudentAdminGoal,
  type InsertStudentAdminGoal
} from "@shared/schema";
import { db } from "./db";
import { eq, and, count, sql, desc } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Auth methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertStudent | InsertAdmin): Promise<User>;
  
  // Student methods
  getAllStudents(): Promise<Student[]>;
  getStudent(reg_no: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(reg_no: string, updates: Partial<Omit<InsertStudent, 'reg_no'> & { password_hash: string }>): Promise<Student>;
  deleteStudent(reg_no: string): Promise<void>;
  
  // Problem methods
  getAllProblems(): Promise<Problem[]>;
  getProblem(id: number): Promise<Problem | undefined>;
  createProblem(problem: InsertProblem): Promise<Problem>;
  createProblems(problems: InsertProblem[]): Promise<Problem[]>;
  
  // Progress methods
  getStudentProgress(reg_no: string): Promise<StudentProgress[]>;
  getStudentProgressWithProblems(reg_no: string): Promise<(StudentProgress & { problem: Problem })[]>;
  getStudentProgressWithAllProblems(reg_no: string): Promise<(Problem & { status?: string; notes?: string })[]>;
  updateProgress(reg_no: string, problem_id: number, status: string): Promise<StudentProgress>;
  getProgressStats(reg_no: string): Promise<{
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
  }>;
  getAllStudentsProgress(): Promise<(Student & { 
    completed: number; 
    in_progress: number; 
    not_started: number; 
    total: number 
  })[]>;
  
  // Notes methods
  getStudentNotes(reg_no: string, problem_id: number): Promise<StudentNotes | undefined>;
  saveNote(reg_no: string, problem_id: number, note: string): Promise<StudentNotes>;
  deleteNote(reg_no: string, problem_id: number): Promise<void>;
  
  // Bookmark methods
  getStudentBookmarks(reg_no: string): Promise<Bookmark[]>;
  toggleBookmark(reg_no: string, problem_id: number): Promise<boolean>;
  
  // Password and Auth methods
  verifyStudentPassword(reg_no: string, password: string): Promise<boolean>;
  updateStudentPassword(reg_no: string, newPassword: string): Promise<void>;
  
  // Student Goals methods
  getStudentGoals(reg_no: string): Promise<StudentGoal[]>;
  setStudentGoal(reg_no: string, type: string, target: number): Promise<StudentGoal>;
  getTodayProgress(reg_no: string): Promise<{ completed_today: number }>;
  getWeekProgress(reg_no: string): Promise<{ completed_week: number }>;

  // Admin Goals methods
  createAdminGoal(goal: InsertAdminGoal): Promise<AdminGoal>;
  getAdminGoals(): Promise<AdminGoal[]>;
  updateAdminGoal(id: number, updates: Partial<InsertAdminGoal>): Promise<AdminGoal | null>;
  deleteAdminGoal(id: number): Promise<boolean>;
  assignGoalToAllStudents(goalId: number): Promise<void>;
  assignGoalToStudent(goalId: number, reg_no: string): Promise<StudentAdminGoal>;
  getStudentAdminGoals(reg_no: string): Promise<(StudentAdminGoal & { adminGoal: AdminGoal })[]>;
  updateStudentAdminGoalProgress(id: number, progress: number): Promise<StudentAdminGoal | null>;
  getAdminGoalAnalytics(goalId: number): Promise<any>;
  
  // Export methods
  getSolvedProblems(reg_no: string): Promise<(StudentProgress & { problem: Problem })[]>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  private async hashPassword(password: string): Promise<string> {
    const scryptAsync = promisify(scrypt);
    const salt = randomBytes(16).toString('hex');
    const hashedPassword = await scryptAsync(password, salt, 32) as Buffer;
    return `${salt}:${hashedPassword.toString('hex')}`;
  }

  async getUser(id: string): Promise<User | undefined> {
    // Try student first
    const [student] = await db.select().from(students).where(eq(students.reg_no, id));
    if (student) {
      return { ...student, type: 'student' as const };
    }
    
    // Try admin
    const [adminUser] = await db.select().from(admin).where(eq(admin.username, id));
    if (adminUser) {
      return { ...adminUser, type: 'admin' as const };
    }
    
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.getUser(username);
  }

  async createUser(user: InsertStudent | InsertAdmin): Promise<User> {
    if ('reg_no' in user) {
      // Student
      const [newStudent] = await db
        .insert(students)
        .values({
          reg_no: user.reg_no,
          name: user.name,
          department: user.department,
          password_hash: await this.hashPassword(user.password)
        })
        .returning();
      return { ...newStudent, type: 'student' as const };
    } else {
      // Admin
      const [newAdmin] = await db
        .insert(admin)
        .values({
          username: user.username,
          password_hash: await this.hashPassword(user.password)
        })
        .returning();
      return { ...newAdmin, type: 'admin' as const };
    }
  }

  async getAllStudents(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async getStudent(reg_no: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.reg_no, reg_no));
    return student || undefined;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db
      .insert(students)
      .values({
        reg_no: student.reg_no,
        name: student.name,
        department: student.department,
        password_hash: await this.hashPassword(student.password)
      })
      .returning();
    return newStudent;
  }

  async updateStudent(reg_no: string, updates: Partial<Omit<InsertStudent, 'reg_no'> & { password_hash: string }>): Promise<Student> {
    const [updatedStudent] = await db
      .update(students)
      .set(updates)
      .where(eq(students.reg_no, reg_no))
      .returning();
    return updatedStudent;
  }

  async updateStudentByAdmin(reg_no: string, updateData: { name?: string; department?: string; password?: string }): Promise<Student> {
    const dataToUpdate: any = {};
    
    if (updateData.name) dataToUpdate.name = updateData.name;
    if (updateData.department) dataToUpdate.department = updateData.department;
    if (updateData.password) {
      dataToUpdate.password_hash = await this.hashPassword(updateData.password);
    }
    
    const [updatedStudent] = await db
      .update(students)
      .set(dataToUpdate)
      .where(eq(students.reg_no, reg_no))
      .returning();
    
    return updatedStudent;
  }

  async deleteStudent(reg_no: string): Promise<void> {
    // Delete related records first
    await db.delete(student_progress).where(eq(student_progress.reg_no, reg_no));
    await db.delete(student_notes).where(eq(student_notes.reg_no, reg_no));
    await db.delete(bookmarks).where(eq(bookmarks.reg_no, reg_no));
    await db.delete(students).where(eq(students.reg_no, reg_no));
  }

  async getAllProblems(): Promise<Problem[]> {
    return await db.select().from(problems);
  }

  async getProblem(id: number): Promise<Problem | undefined> {
    const [problem] = await db.select().from(problems).where(eq(problems.id, id));
    return problem || undefined;
  }

  async createProblem(problem: InsertProblem): Promise<Problem> {
    const [newProblem] = await db
      .insert(problems)
      .values(problem)
      .returning();
    return newProblem;
  }

  async createProblems(problemsList: InsertProblem[]): Promise<Problem[]> {
    return await db.insert(problems).values(problemsList).returning();
  }

  async getStudentProgress(reg_no: string): Promise<StudentProgress[]> {
    return await db.select().from(student_progress).where(eq(student_progress.reg_no, reg_no));
  }

  async getStudentProgressWithProblems(reg_no: string): Promise<(StudentProgress & { problem: Problem })[]> {
    const result = await db
      .select({
        id: student_progress.id,
        reg_no: student_progress.reg_no,
        problem_id: student_progress.problem_id,
        status: student_progress.status,
        problem: problems
      })
      .from(student_progress)
      .innerJoin(problems, eq(student_progress.problem_id, problems.id))
      .where(eq(student_progress.reg_no, reg_no));
    
    return result as (StudentProgress & { problem: Problem })[];
  }

  async getStudentProgressWithAllProblems(reg_no: string): Promise<(Problem & { status?: string; notes?: string })[]> {
    const allProblems = await db.select().from(problems);
    const progressData = await db
      .select()
      .from(student_progress)
      .where(eq(student_progress.reg_no, reg_no));
    
    const notesData = await db
      .select()
      .from(student_notes)
      .where(eq(student_notes.reg_no, reg_no));

    return allProblems.map(problem => {
      const progress = progressData.find(p => p.problem_id === problem.id);
      const notes = notesData.find(n => n.problem_id === problem.id);
      
      return {
        ...problem,
        status: progress?.status || 'not_started',
        notes: notes?.note || ''
      };
    });
  }

  async updateProgress(reg_no: string, problem_id: number, status: string): Promise<StudentProgress> {
    // Check if progress record exists
    const [existing] = await db
      .select()
      .from(student_progress)
      .where(and(
        eq(student_progress.reg_no, reg_no),
        eq(student_progress.problem_id, problem_id)
      ));

    if (existing) {
      const [updated] = await db
        .update(student_progress)
        .set({ status })
        .where(and(
          eq(student_progress.reg_no, reg_no),
          eq(student_progress.problem_id, problem_id)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(student_progress)
        .values({ reg_no, problem_id, status })
        .returning();
      return created;
    }
  }

  async getProgressStats(reg_no: string): Promise<{
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
  }> {
    const totalProblems = await db.select({ count: count() }).from(problems);
    const total = totalProblems[0].count;

    const progressCounts = await db
      .select({
        status: student_progress.status,
        count: count()
      })
      .from(student_progress)
      .where(eq(student_progress.reg_no, reg_no))
      .groupBy(student_progress.status);

    const stats = {
      total,
      completed: 0,
      in_progress: 0,
      not_started: 0
    };

    progressCounts.forEach(({ status, count: statusCount }) => {
      if (status === 'completed') stats.completed = statusCount;
      else if (status === 'in_progress') stats.in_progress = statusCount;
    });

    stats.not_started = total - stats.completed - stats.in_progress;

    return stats;
  }

  async getAllStudentsProgress(): Promise<(Student & { 
    completed: number; 
    in_progress: number; 
    not_started: number; 
    total: number 
  })[]> {
    const allStudents = await this.getAllStudents();
    const totalProblems = await db.select({ count: count() }).from(problems);
    const total = totalProblems[0].count;

    const studentsWithProgress = await Promise.all(
      allStudents.map(async (student) => {
        const stats = await this.getProgressStats(student.reg_no);
        return {
          ...student,
          ...stats
        };
      })
    );

    return studentsWithProgress;
  }

  async getGlobalDifficultyProgress(): Promise<any[]> {
    // Get all problems grouped by difficulty
    const problemsByDifficulty = await db
      .select({
        difficulty: problems.difficulty,
        problem_id: problems.id,
        title: problems.title,
        category: problems.category
      })
      .from(problems);

    // Get all student progress
    const allProgress = await db
      .select({
        problem_id: student_progress.problem_id,
        status: student_progress.status,
        difficulty: problems.difficulty
      })
      .from(student_progress)
      .leftJoin(problems, eq(student_progress.problem_id, problems.id));

    // Get total number of students
    const totalStudents = await db.select({ count: count() }).from(students);
    const studentCount = totalStudents[0].count;

    // Calculate statistics for each difficulty level
    const difficultyStats = problemsByDifficulty.reduce((acc, problem) => {
      const difficulty = problem.difficulty;
      if (!acc[difficulty]) {
        acc[difficulty] = {
          difficulty,
          total_problems: 0,
          completed_by_students: 0,
          in_progress_by_students: 0,
          not_started_by_students: 0,
          total_student_attempts: 0
        };
      }
      
      acc[difficulty].total_problems++;
      
      // Count how many students have attempted this problem
      const problemProgress = allProgress.filter(p => p.problem_id === problem.problem_id);
      const completed = problemProgress.filter(p => p.status === 'completed').length;
      const inProgress = problemProgress.filter(p => p.status === 'in_progress').length;
      const notStarted = studentCount - completed - inProgress;
      
      acc[difficulty].completed_by_students += completed;
      acc[difficulty].in_progress_by_students += inProgress;
      acc[difficulty].not_started_by_students += notStarted;
      acc[difficulty].total_student_attempts += studentCount;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(difficultyStats);
  }

  async getStudentNotes(reg_no: string, problem_id: number): Promise<StudentNotes | undefined> {
    const [note] = await db
      .select()
      .from(student_notes)
      .where(and(
        eq(student_notes.reg_no, reg_no),
        eq(student_notes.problem_id, problem_id)
      ));
    return note || undefined;
  }

  async saveNote(reg_no: string, problem_id: number, note: string): Promise<StudentNotes> {
    const existing = await this.getStudentNotes(reg_no, problem_id);
    
    if (existing) {
      const [updated] = await db
        .update(student_notes)
        .set({ note })
        .where(and(
          eq(student_notes.reg_no, reg_no),
          eq(student_notes.problem_id, problem_id)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(student_notes)
        .values({ reg_no, problem_id, note })
        .returning();
      return created;
    }
  }

  async deleteNote(reg_no: string, problem_id: number): Promise<void> {
    await db
      .delete(student_notes)
      .where(and(
        eq(student_notes.reg_no, reg_no),
        eq(student_notes.problem_id, problem_id)
      ));
  }

  async getStudentBookmarks(reg_no: string): Promise<Bookmark[]> {
    return await db.select().from(bookmarks).where(eq(bookmarks.reg_no, reg_no));
  }

  async toggleBookmark(reg_no: string, problem_id: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(bookmarks)
      .where(and(
        eq(bookmarks.reg_no, reg_no),
        eq(bookmarks.problem_id, problem_id)
      ));

    if (existing) {
      await db
        .delete(bookmarks)
        .where(and(
          eq(bookmarks.reg_no, reg_no),
          eq(bookmarks.problem_id, problem_id)
        ));
      return false; // Bookmark removed
    } else {
      await db
        .insert(bookmarks)
        .values({ reg_no, problem_id });
      return true; // Bookmark added
    }
  }

  // Password and Auth methods
  async verifyStudentPassword(reg_no: string, password: string): Promise<boolean> {
    const student = await this.getStudent(reg_no);
    if (!student) return false;

    try {
      const scryptAsync = promisify(scrypt);
      const [salt, key] = student.password_hash.split(':');
      const hashedBuffer = await scryptAsync(password, salt, 64) as Buffer;
      const hashedPassword = hashedBuffer.toString('hex');
      return hashedPassword === key;
    } catch {
      return false;
    }
  }

  async updateStudentPassword(reg_no: string, newPassword: string): Promise<void> {
    const scryptAsync = promisify(scrypt);
    const salt = randomBytes(16).toString('hex');
    const hashedBuffer = await scryptAsync(newPassword, salt, 64) as Buffer;
    const hashedPassword = hashedBuffer.toString('hex');
    const password_hash = `${salt}:${hashedPassword}`;

    await db
      .update(students)
      .set({ password_hash })
      .where(eq(students.reg_no, reg_no));
  }

  // Goals methods (temporarily return empty data until we can push schema)
  async getStudentGoals(reg_no: string): Promise<StudentGoal[]> {
    try {
      return await db.select().from(student_goals).where(eq(student_goals.reg_no, reg_no));
    } catch {
      // Table doesn't exist yet, return empty array
      return [];
    }
  }

  async setEnhancedStudentGoal(
    reg_no: string, 
    type: string, 
    target: number, 
    category: string | null = null, 
    difficulty: string | null = null, 
    reminder: number = 0, 
    notes: string | null = null, 
    priority: string = "medium"
  ): Promise<StudentGoal> {
    // Insert new goal (allow multiple goals of same type)
    const [goal] = await db
      .insert(student_goals)
      .values({ 
        reg_no, 
        type, 
        target, 
        category, 
        difficulty, 
        reminder, 
        notes, 
        priority 
      })
      .returning();
    
    return goal;
  }

  // Keep backward compatibility
  async setStudentGoal(reg_no: string, type: string, target: number): Promise<StudentGoal> {
    return this.setEnhancedStudentGoal(reg_no, type, target);
  }

  async getTodayProgress(reg_no: string): Promise<{ completed_today: number }> {
    // For now, return 0 since we don't track completion dates
    // This could be enhanced later to track actual daily progress
    return { completed_today: 0 };
  }

  async getWeekProgress(reg_no: string): Promise<{ completed_week: number }> {
    // For now, return 0 since we don't track completion dates
    // This could be enhanced later to track actual weekly progress
    return { completed_week: 0 };
  }

  // Admin Goals methods
  async createAdminGoal(goal: InsertAdminGoal): Promise<AdminGoal> {
    const [newGoal] = await db
      .insert(admin_goals)
      .values(goal)
      .returning();
    return newGoal;
  }

  async getAdminGoals(): Promise<AdminGoal[]> {
    return await db.select().from(admin_goals).where(eq(admin_goals.is_active, true));
  }

  async updateAdminGoal(id: number, updates: Partial<InsertAdminGoal>): Promise<AdminGoal | null> {
    const [updated] = await db
      .update(admin_goals)
      .set(updates)
      .where(eq(admin_goals.id, id))
      .returning();
    return updated || null;
  }

  async deleteAdminGoal(id: number): Promise<boolean> {
    const result = await db
      .update(admin_goals)
      .set({ is_active: false })
      .where(eq(admin_goals.id, id));
    return (result.rowCount || 0) > 0;
  }

  async assignGoalToAllStudents(goalId: number): Promise<void> {
    const allStudents = await db.select({ reg_no: students.reg_no }).from(students);
    
    const assignments = allStudents.map(student => ({
      reg_no: student.reg_no,
      admin_goal_id: goalId,
      current_progress: 0,
      is_completed: false
    }));

    await db.insert(student_admin_goals).values(assignments);
  }

  async assignGoalToStudent(goalId: number, reg_no: string): Promise<StudentAdminGoal> {
    const [assignment] = await db
      .insert(student_admin_goals)
      .values({
        reg_no,
        admin_goal_id: goalId,
        current_progress: 0,
        is_completed: false
      })
      .returning();
    return assignment;
  }

  async getStudentAdminGoals(reg_no: string): Promise<(StudentAdminGoal & { adminGoal: AdminGoal })[]> {
    const assignments = await db
      .select()
      .from(student_admin_goals)
      .innerJoin(admin_goals, eq(student_admin_goals.admin_goal_id, admin_goals.id))
      .where(and(
        eq(student_admin_goals.reg_no, reg_no),
        eq(admin_goals.is_active, true)
      ));

    return assignments.map(row => ({
      ...row.student_admin_goals,
      adminGoal: row.admin_goals
    }));
  }

  async updateStudentAdminGoalProgress(id: number, progress: number): Promise<StudentAdminGoal | null> {
    const [updated] = await db
      .update(student_admin_goals)
      .set({ 
        current_progress: progress,
        is_completed: progress >= 100,
        completed_at: progress >= 100 ? new Date() : null
      })
      .where(eq(student_admin_goals.id, id))
      .returning();
    return updated || null;
  }

  async getAdminGoalAnalytics(goalId: number): Promise<any> {
    const totalStudents = await db
      .select({ count: count() })
      .from(student_admin_goals)
      .where(eq(student_admin_goals.admin_goal_id, goalId));

    const completedStudents = await db
      .select({ count: count() })
      .from(student_admin_goals)
      .where(and(
        eq(student_admin_goals.admin_goal_id, goalId),
        eq(student_admin_goals.is_completed, true)
      ));

    const averageProgress = await db
      .select({ avg: sql<number>`AVG(${student_admin_goals.current_progress})` })
      .from(student_admin_goals)
      .where(eq(student_admin_goals.admin_goal_id, goalId));

    const progressDistribution = await db
      .select({
        reg_no: student_admin_goals.reg_no,
        student_name: students.name,
        current_progress: student_admin_goals.current_progress,
        is_completed: student_admin_goals.is_completed,
        completed_at: student_admin_goals.completed_at
      })
      .from(student_admin_goals)
      .innerJoin(students, eq(student_admin_goals.reg_no, students.reg_no))
      .where(eq(student_admin_goals.admin_goal_id, goalId))
      .orderBy(desc(student_admin_goals.current_progress));

    return {
      totalStudents: totalStudents[0]?.count || 0,
      completedStudents: completedStudents[0]?.count || 0,
      averageProgress: Math.round(averageProgress[0]?.avg || 0),
      progressDistribution
    };
  }

  // Export methods
  async getSolvedProblems(reg_no: string): Promise<(StudentProgress & { problem: Problem })[]> {
    const solvedProgress = await db
      .select()
      .from(student_progress)
      .innerJoin(problems, eq(student_progress.problem_id, problems.id))
      .where(and(
        eq(student_progress.reg_no, reg_no),
        eq(student_progress.status, 'completed')
      ));

    return solvedProgress.map(row => ({
      ...row.student_progress,
      problem: row.problems
    }));
  }
}

export const storage = new DatabaseStorage();
