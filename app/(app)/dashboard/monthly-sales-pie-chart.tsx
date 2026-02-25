"use client"

import { useEffect, useState } from "react"
import { getApiUrl } from "@/lib/api-config"
import { TrendingUp, Loader2, PieChart as PieChartIcon } from "lucide-react"
import { Pie, PieChart, Cell } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export const description = "A pie chart with a label"

type CategoryData = {
  category: string
  sales: number
  fill: string
}

// Curated palette for pie chart slices
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#0088FE",
];

export function MonthlySalesPieChart() {
  const [data, setData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
        try {
            const res = await fetch(getApiUrl('/sales/monthly-category'))
            const result = await res.json()
            if (result.success) {
                // Ensure fill color is set for each item
                const enhancedData = result.data.map((item: any, index: number) => ({
                    ...item,
                    fill: COLORS[index % COLORS.length]
                }));
                setData(enhancedData)
            }
        } catch (error) {
            console.error("Failed to fetch monthly category sales", error)
        } finally {
            setLoading(false)
        }
    }
    fetchData()
  }, [])

  const chartConfig = {
    sales: {
      label: "Sales",
    },
    ...data.reduce((acc, item, index) => {
        acc[item.category] = {
            label: item.category,
            color: item.fill,
        }
        return acc
    }, {} as Record<string, { label: string; color: string }>)
  } satisfies ChartConfig

  const totalSales = data.reduce((acc, item) => acc + item.sales, 0);

  if (loading) {
     return (
        <Card className="glass-card border-none shadow-sm flex items-center justify-center h-full min-h-[350px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Card>
     )
  }

  if (data.length === 0) {
      return (
        <Card className="glass-card border-none shadow-sm h-full min-h-[350px]">
             <CardHeader>
                <CardTitle>Monthly Sales</CardTitle>
                <CardDescription>No sales data for this month.</CardDescription>
            </CardHeader>
        </Card>
      )
  }

  return (
    <Card className="flex flex-col glass-card border-none shadow-sm h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>Monthly Sales</CardTitle>
        <CardDescription>Sales by Category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[250px] pb-0"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie 
                data={data} 
                dataKey="sales" 
                label 
                nameKey="category"
            >
             {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.2)" />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Total Sales: ₱{totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Category performance for {new Date().toLocaleString('default', { month: 'long' })}
        </div>
      </CardFooter>
    </Card>
  )
}
