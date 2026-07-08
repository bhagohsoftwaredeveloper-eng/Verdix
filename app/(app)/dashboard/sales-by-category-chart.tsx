"use client"

import { useEffect, useState } from "react"
import { getApiUrl } from "@/lib/api-config"
import { TrendingUp, Loader2 } from "lucide-react"
import { Pie, PieChart, Label, Cell, Bar, BarChart, XAxis, YAxis, LabelList } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A donut chart with text"

type CategoryData = {
  name: string
  value: number
  fill?: string
}

const chartConfig = {
  value: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
  category: {
    label: "Category",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

// Above this many slices a pie becomes cluttered — switch to a ranked bar chart.
const MAX_PIE_SLICES = 5

export function SalesByCategoryChart({ data: initialData }: { data?: any[] }) {
  const [data, setData] = useState<CategoryData[]>(initialData || [])
  const [loading, setLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) {
        const dataWithColors = initialData.map((item, index) => ({
            ...item,
            fill: item.fill || `hsl(var(--chart-${(index % 5) + 1}))`
        }));
        setData(dataWithColors)
        setLoading(false)
        return;
    }

    // Fallback fetch if needed (though dashboard usually passes data)
    async function fetchData() {
        try {
            const res = await fetch(getApiUrl('/reports/stats')) // Use the same endpoint or specific one if available?
            // The dashboard uses /api/reports/stats which returns everything.
            // For now, assume data is passed via props or handle empty.
            // If data is null, we just show loading or empty.
            setLoading(false) 
        } catch (error) {
            console.error("Failed to fetch category data", error)
            setLoading(false)
        }
    }
    // fetchData() 
  }, [initialData])

  const totalSales = data.reduce((acc, curr) => acc + curr.value, 0)
  const useBarChart = data.length > MAX_PIE_SLICES
  const rankedData = [...data].sort((a, b) => b.value - a.value)

  if (loading) {
     return (
        <Card className="glass-card border-none shadow-sm flex items-center justify-center h-[350px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Card>
     )
  }
  
  if (data.length === 0) {
      return (
        <Card className="glass-card border-none shadow-sm h-[350px]">
             <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>No sales data available yet.</CardDescription>
            </CardHeader>
        </Card>
      )
  }

  return (
    <Card className="flex flex-col glass-card border-none shadow-sm h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>Sales by Category</CardTitle>
        <CardDescription>Breakdown of sales revenue</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {useBarChart ? (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart
              accessibilityLayer
              data={rankedData}
              layout="vertical"
              margin={{ left: 12, right: 64 }}
            >
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} hide />
              <XAxis dataKey="value" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="value" layout="vertical" radius={4} fill="var(--color-value)">
                <LabelList
                  dataKey="name"
                  position="insideLeft"
                  offset={8}
                  fill="white"
                  fontSize={13}
                  fontWeight="500"
                />
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={8}
                  fill="hsl(var(--foreground))"
                  fontSize={13}
                  fontWeight="600"
                  formatter={(value: number) => `₱${value.toLocaleString()}`}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold"
                          >
                            ₱{totalSales.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            Total Sales
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Across {data.length} {data.length === 1 ? 'category' : 'categories'} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing distribution of sales revenue
        </div>
      </CardFooter>
    </Card>
  )
}
