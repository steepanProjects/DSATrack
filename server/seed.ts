import { db } from "./db";
import { students, admin, problems } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

function parseStudentsFromFile(): Array<{
  name: string;
  department: string;
  reg_no: string;
}> {
  const filePath = path.join(process.cwd(), "attached_assets", "namelist_1753695183369.txt");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  
  const students = [];
  const lines = fileContent.split("\n").filter(line => line.trim());
  
  for (const line of lines) {
    const parts = line.split("|").map(part => part.trim());
    if (parts.length === 3) {
      students.push({
        name: parts[0],
        department: parts[1],
        reg_no: parts[2]
      });
    }
  }
  
  return students;
}

function parseProblemsFromFile(): Array<{
  title: string;
  category: string;
  difficulty: string;
}> {
  const filePath = path.join(process.cwd(), "attached_assets", "DSA_Learning_Path_Categorized_1753695183370.txt");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  
  const problems = [];
  const lines = fileContent.split("\n");
  let currentCategory = "";
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and headers
    if (!trimmed || trimmed.startsWith("=") || trimmed.startsWith("DSA LEARNING PATH") || trimmed.startsWith("TOTAL PROBLEMS") || trimmed.startsWith("DIFFICULTY BREAKDOWN")) {
      continue;
    }
    
    // Check for step headers (STEP 1:, STEP 2:, etc.)
    if (trimmed.match(/^STEP \d+:/)) {
      const match = trimmed.match(/^STEP \d+: (.+?) \(/);
      if (match) {
        currentCategory = match[1].trim();
      }
      continue;
    }
    
    // Check for lecture headers (Lec 1:, Lec 2:, etc.)
    if (trimmed.match(/^Lec \d+:/)) {
      continue;
    }
    
    // Check for section dividers
    if (trimmed.match(/^-+$/)) {
      continue;
    }
    
    // Parse problem lines (format: "number. Title - Difficulty")
    const problemMatch = trimmed.match(/^(\d+)\.\s*(.+?)\s*-\s*(Easy|Medium|Hard)$/);
    if (problemMatch && currentCategory) {
      problems.push({
        title: problemMatch[2].trim(),
        category: currentCategory,
        difficulty: problemMatch[3]
      });
    }
  }
  
  return problems;
}

export async function seedDatabase() {
  try {
    console.log("Starting database seeding...");
    
    // Create admin user
    const adminPasswordHash = await hashPassword("admin@123");
    await db.insert(admin).values({
      username: "admin",
      password_hash: adminPasswordHash
    }).onConflictDoNothing();
    
    console.log("Admin user created");
    
    // Parse and insert students
    const studentsData = parseStudentsFromFile();
    const defaultPasswordHash = await hashPassword("12345678");
    
    const studentsToInsert = studentsData.map(student => ({
      ...student,
      password_hash: defaultPasswordHash
    }));
    
    await db.insert(students).values(studentsToInsert).onConflictDoNothing();
    console.log(`${studentsData.length} students inserted`);
    
    // Parse and insert problems
    const problemsData = parseProblemsFromFile();
    if (problemsData.length > 0) {
      await db.insert(problems).values(problemsData).onConflictDoNothing();
      console.log(`${problemsData.length} problems inserted`);
    } else {
      console.log("No problems found to insert");
    }
    
    console.log("Database seeding completed successfully!");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
