import { 
  students, 
  admin, 
  problems, 
  student_progress, 
  student_notes, 
  bookmarks,
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
  type InsertBookmark
} from "@shared/schema";
import { db } from "./db";
import { eq, and, count, sql } from "drizzle-orm";
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
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
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
          password_hash: user.password_hash
        })
        .returning();
      return { ...newStudent, type: 'student' as const };
    } else {
      // Admin
      const [newAdmin] = await db
        .insert(admin)
        .values({
          username: user.username,
          password_hash: user.password_hash
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
        password_hash: student.password_hash
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
    return await db
      .select({
        id: student_progress.id,
        reg_no: student_progress.reg_no,
        problem_id: student_progress.problem_id,
        status: student_progress.status,
        problem: problems
      })
      .from(student_progress)
      .leftJoin(problems, eq(student_progress.problem_id, problems.id))
      .where(eq(student_progress.reg_no, reg_no));
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
}

export const storage = new DatabaseStorage();
