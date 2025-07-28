import { sql, relations } from "drizzle-orm";
import { pgTable, text, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const students = pgTable("students", {
  reg_no: text("reg_no").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  password_hash: text("password_hash").notNull(),
});

export const admin = pgTable("admin", {
  username: text("username").primaryKey(),
  password_hash: text("password_hash").notNull(),
});

export const problems = pgTable("problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
});

export const student_progress = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  reg_no: text("reg_no").notNull().references(() => students.reg_no),
  problem_id: integer("problem_id").notNull().references(() => problems.id),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed
});

export const student_notes = pgTable("student_notes", {
  id: serial("id").primaryKey(),
  reg_no: text("reg_no").notNull().references(() => students.reg_no),
  problem_id: integer("problem_id").notNull().references(() => problems.id),
  note: text("note").notNull(),
});

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  reg_no: text("reg_no").notNull().references(() => students.reg_no),
  problem_id: integer("problem_id").notNull().references(() => problems.id),
});

export const student_goals = pgTable("student_goals", {
  id: serial("id").primaryKey(),
  reg_no: text("reg_no").notNull().references(() => students.reg_no),
  type: text("type").notNull(), // daily, weekly
  target: integer("target").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Relations
export const studentsRelations = relations(students, ({ many }) => ({
  progress: many(student_progress),
  notes: many(student_notes),
  bookmarks: many(bookmarks),
  goals: many(student_goals),
}));

export const problemsRelations = relations(problems, ({ many }) => ({
  progress: many(student_progress),
  notes: many(student_notes),
  bookmarks: many(bookmarks),
}));

export const studentProgressRelations = relations(student_progress, ({ one }) => ({
  student: one(students, {
    fields: [student_progress.reg_no],
    references: [students.reg_no],
  }),
  problem: one(problems, {
    fields: [student_progress.problem_id],
    references: [problems.id],
  }),
}));

export const studentNotesRelations = relations(student_notes, ({ one }) => ({
  student: one(students, {
    fields: [student_notes.reg_no],
    references: [students.reg_no],
  }),
  problem: one(problems, {
    fields: [student_notes.problem_id],
    references: [problems.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  student: one(students, {
    fields: [bookmarks.reg_no],
    references: [students.reg_no],
  }),
  problem: one(problems, {
    fields: [bookmarks.problem_id],
    references: [problems.id],
  }),
}));

export const studentGoalsRelations = relations(student_goals, ({ one }) => ({
  student: one(students, {
    fields: [student_goals.reg_no],
    references: [students.reg_no],
  }),
}));

// Insert schemas
export const insertStudentSchema = createInsertSchema(students).omit({
  password_hash: true,
}).extend({
  password: z.string().min(8),
});

export const insertAdminSchema = createInsertSchema(admin).omit({
  password_hash: true,
}).extend({
  password: z.string().min(8),
});

export const insertProblemSchema = createInsertSchema(problems).omit({
  id: true,
});

export const insertStudentProgressSchema = createInsertSchema(student_progress).omit({
  id: true,
});

export const insertStudentNotesSchema = createInsertSchema(student_notes).omit({
  id: true,
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
});

export const insertStudentGoalSchema = createInsertSchema(student_goals).omit({
  id: true,
  created_at: true,
});

// Types
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Admin = typeof admin.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Problem = typeof problems.$inferSelect;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type StudentProgress = typeof student_progress.$inferSelect;
export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type StudentNotes = typeof student_notes.$inferSelect;
export type InsertStudentNotes = z.infer<typeof insertStudentNotesSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type StudentGoal = typeof student_goals.$inferSelect;
export type InsertStudentGoal = z.infer<typeof insertStudentGoalSchema>;

// User type for authentication (union of Student and Admin)
export type User = (Student & { type: 'student' }) | (Admin & { type: 'admin' });
export type InsertUser = InsertStudent | InsertAdmin;
