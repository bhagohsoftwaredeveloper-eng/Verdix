'use client';

import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState } from "react";

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [posTheme, setPosTheme] = useState<string>('system');

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const storedPosTheme = localStorage.getItem('pos-theme');
    if (storedPosTheme) {
        setPosTheme(storedPosTheme);
    }
  }, []);

  const handlePosThemeChange = (value: string) => {
      setPosTheme(value);
      localStorage.setItem('pos-theme', value);
  };

  if (!mounted) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Appearance</h2>
        </div>
         <div className="grid gap-4">
             <Card>
                 <CardHeader>
                    <CardTitle>Theme</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="h-32 bg-muted animate-pulse rounded-md"></div>
                 </CardContent>
             </Card>
         </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Appearance</h2>
      </div>
      
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Application Theme</CardTitle>
            <CardDescription>
              Select the theme for the main application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              defaultValue={theme}
              value={theme}
              onValueChange={(value) => {
                setTheme(value);
                localStorage.setItem('admin-theme', value);
              }}
              className="grid max-w-md grid-cols-1 gap-8 pt-2 md:grid-cols-3"
            >
              <div className="text-center">
                 <Label className="cursor-pointer" htmlFor="theme-light">
                  <div className={`items-center rounded-md border-2 border-muted p-1 hover:border-accent ${theme === 'light' ? 'border-primary' : ''}`}>
                    <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                      <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                        <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center p-2 font-medium">
                     <span className="mr-2">Light</span>
                     <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                  </div>
                   </Label>
              </div>

              <div className="text-center">
                 <Label className="cursor-pointer" htmlFor="theme-dark">
                  <div className={`items-center rounded-md border-2 border-muted p-1 hover:border-accent ${theme === 'dark' ? 'border-primary' : ''}`}>
                    <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                      <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                        <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                    </div>
                  </div>
                   <div className="flex items-center justify-center p-2 font-medium">
                     <span className="mr-2">Dark</span>
                     <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                  </div>
                   </Label>
              </div>

              <div className="text-center">
                 <Label className="cursor-pointer" htmlFor="theme-system">
                  <div className={`items-center rounded-md border-2 border-muted p-1 hover:border-accent ${theme === 'system' ? 'border-primary' : ''}`}>
                    <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                      <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                        <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                         <div className="h-4 w-4 rounded-full bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                    </div>
                  </div>
                   <div className="flex items-center justify-center p-2 font-medium">
                     <span className="mr-2">System</span>
                     <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                  </div>
                   </Label>
              </div>

            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>POS Theme</CardTitle>
            <CardDescription>
              Select the theme specifically for the Point of Sale screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              defaultValue={posTheme}
              value={posTheme}
              onValueChange={handlePosThemeChange}
              className="grid max-w-md grid-cols-1 gap-8 pt-2 md:grid-cols-3"
            >
              <div className="text-center">
                 <Label className="cursor-pointer" htmlFor="pos-theme-light">
                  <div className={`items-center rounded-md border-2 border-muted p-1 hover:border-accent ${posTheme === 'light' ? 'border-primary' : ''}`}>
                    <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                      <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                        <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                        <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center p-2 font-medium">
                     <span className="mr-2">Light</span>
                     <RadioGroupItem value="light" id="pos-theme-light" className="sr-only" />
                  </div>
                   </Label>
              </div>

              <div className="text-center">
                 <Label className="cursor-pointer" htmlFor="pos-theme-dark">
                  <div className={`items-center rounded-md border-2 border-muted p-1 hover:border-accent ${posTheme === 'dark' ? 'border-primary' : ''}`}>
                    <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                      <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                        <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                    </div>
                  </div>
                   <div className="flex items-center justify-center p-2 font-medium">
                     <span className="mr-2">Dark</span>
                     <RadioGroupItem value="dark" id="pos-theme-dark" className="sr-only" />
                  </div>
                   </Label>
              </div>

              <div className="text-center">
                 <Label className="cursor-pointer" htmlFor="pos-theme-system">
                  <div className={`items-center rounded-md border-2 border-muted p-1 hover:border-accent ${posTheme === 'system' ? 'border-primary' : ''}`}>
                    <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                      <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                        <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                        <div className="h-4 w-4 rounded-full bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                      <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                         <div className="h-4 w-4 rounded-full bg-slate-400" />
                        <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                      </div>
                    </div>
                  </div>
                   <div className="flex items-center justify-center p-2 font-medium">
                     <span className="mr-2">Use Global</span>
                     <RadioGroupItem value="system" id="pos-theme-system" className="sr-only" />
                  </div>
                   </Label>
              </div>

            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
