'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup } from '@/components/ui/radio-group';
import { useAppearance } from './use-appearance';
import { ThemeCard } from './ThemeCard';

export default function AppearanceSettingsPage() {
  const { theme, posTheme, mounted, handleAppThemeChange, handlePosThemeChange } = useAppearance();

  if (!mounted) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Appearance</h2>
        </div>
        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle>Theme</CardTitle></CardHeader>
            <CardContent><div className="h-32 bg-muted animate-pulse rounded-md" /></CardContent>
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
            <CardDescription>Select the theme for the main application.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={theme} onValueChange={handleAppThemeChange} className="grid max-w-md grid-cols-1 gap-8 pt-2 md:grid-cols-3">
              <ThemeCard value="light" currentValue={theme} label="Light" htmlFor="theme-light" variant="light" />
              <ThemeCard value="dark" currentValue={theme} label="Dark" htmlFor="theme-dark" variant="dark" />
              <ThemeCard value="system" currentValue={theme} label="System" htmlFor="theme-system" variant="dark" />
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>POS Theme</CardTitle>
            <CardDescription>Select the theme specifically for the Point of Sale screen.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={posTheme} onValueChange={handlePosThemeChange} className="grid max-w-md grid-cols-1 gap-8 pt-2 md:grid-cols-3">
              <ThemeCard value="light" currentValue={posTheme} label="Light" htmlFor="pos-theme-light" variant="light" />
              <ThemeCard value="dark" currentValue={posTheme} label="Dark" htmlFor="pos-theme-dark" variant="dark" />
              <ThemeCard value="system" currentValue={posTheme} label="Use Global" htmlFor="pos-theme-system" variant="dark" />
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
