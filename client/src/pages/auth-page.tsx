import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const studentLoginSchema = z.object({
  username: z.string().min(1, "Registration number is required"),
  password: z.string().min(1, "Password is required"),
});

const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const studentRegisterSchema = z.object({
  reg_no: z.string().min(1, "Registration number is required"),
  name: z.string().min(1, "Name is required"),
  department: z.string().min(1, "Department is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("student");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.type === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/");
      }
    }
  }, [user, setLocation]);

  const studentLoginForm = useForm({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const adminLoginForm = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "admin",
      password: "",
    },
  });

  const studentRegisterForm = useForm({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: {
      reg_no: "",
      name: "",
      department: "",
      password: "",
    },
  });

  const onStudentLogin = async (data: z.infer<typeof studentLoginSchema>) => {
    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Login error:', error);
    }
  };

  const onAdminLogin = async (data: z.infer<typeof adminLoginSchema>) => {
    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Login error:', error);
    }
  };

  const onStudentRegister = async (data: z.infer<typeof studentRegisterSchema>) => {
    try {
      await registerMutation.mutateAsync(data);
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Registration error:', error);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-slate-800 mb-2">
              DSA Progress Tracker
            </CardTitle>
            <p className="text-slate-600">Track your Data Structures & Algorithms journey</p>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="space-y-4">
                <Tabs defaultValue="login">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="mt-4">
                    <Form {...studentLoginForm}>
                      <form onSubmit={studentLoginForm.handleSubmit(onStudentLogin)} className="space-y-4">
                        <FormField
                          control={studentLoginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Registration Number</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 711523BCS001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={studentLoginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Enter your password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? "Logging in..." : "Login as Student"}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="register" className="mt-4">
                    <Form {...studentRegisterForm}>
                      <form onSubmit={studentRegisterForm.handleSubmit(onStudentRegister)} className="space-y-4">
                        <FormField
                          control={studentRegisterForm.control}
                          name="reg_no"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Registration Number</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 711523BCS001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={studentRegisterForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={studentRegisterForm.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., CSE, CSBS, AIML, AI&DS" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={studentRegisterForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Enter your password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? "Registering..." : "Register as Student"}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="admin">
                <Form {...adminLoginForm}>
                  <form onSubmit={adminLoginForm.handleSubmit(onAdminLogin)} className="space-y-4">
                    <FormField
                      control={adminLoginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="admin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={adminLoginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter admin password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-slate-800 hover:bg-slate-900"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Logging in..." : "Login as Admin"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Hero section */}
      <div className="flex-1 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <img 
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400" 
            alt="Students studying programming together" 
            className="w-full h-64 object-cover rounded-lg mb-6 shadow-lg"
          />
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Master Data Structures & Algorithms
          </h2>
          <p className="text-slate-600 mb-6">
            Track your progress through 455+ carefully curated DSA problems. 
            From basics to advanced topics, build your programming skills systematically.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
            <div className="bg-white/50 p-3 rounded-lg">
              <div className="font-semibold text-primary">455+</div>
              <div>Problems</div>
            </div>
            <div className="bg-white/50 p-3 rounded-lg">
              <div className="font-semibold text-secondary">18</div>
              <div>Categories</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
