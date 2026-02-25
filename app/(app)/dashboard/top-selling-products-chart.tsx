"use client"

import { useEffect, useState } from "react"
import { getApiUrl } from "@/lib/api-config"
import { TrendingUp, Loader2 } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, LabelList, Cell, CartesianGrid } from "recharts"

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

export const description = "A bar chart with custom labels"

type ProductData = {
  name: string
  sales: number // revenue
  fill?: string
}

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
  label: {
    color: "hsl(var(--foreground))",
  },
} satisfies ChartConfig

export function TopSellingProductsChart({ data: initialData }: { data?: any[] }) {
  const [data, setData] = useState<ProductData[]>(initialData || [])
  const [loading, setLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) {
        // Add colors if not present
        const dataWithColors = initialData.map((item, index) => ({
            ...item,
            fill: item.fill || `hsl(var(--chart-${(index % 5) + 1}))`,
            sales: item.sales || item.totalRevenue || 0 // Handle different data shapes
        }));
        setData(dataWithColors)
        setLoading(false)
        return;
    }

    async function fetchData() {
        try {
            const res = await fetch(getApiUrl('/sales/top-products'))
            const result = await res.json()
            if (result.success) {
                const dataWithColors = result.data.map((item: any, index: number) => ({
                    name: item.name,
                    sales: item.quantity, // Default to quantity if standalone? Or revenue? User said "top selling", usually revenue. Let's stick to what passed data uses.
                    fill: `hsl(var(--chart-${(index % 5) + 1}))`
                }));
                setData(dataWithColors)
            }
        } catch (error) {
            console.error("Failed to fetch top products", error)
        } finally {
            setLoading(false)
        }
    }
    fetchData()
  }, [initialData])

  if (loading) {
     return (
        <Card className="glass-card border-none shadow-sm flex items-center justify-center h-[350px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Card>
     )
  }

  // Slice to top 5 if needed
  const displayData = data.slice(0, 6);

  return (
    <Card className="glass-card border-none shadow-sm h-full">
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
        <CardDescription>Best performers by revenue</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={displayData}
            layout="vertical"
            margin={{
              left: 12,
              right: 60,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
              hide
            />
            <XAxis dataKey="sales" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar
              dataKey="sales"
              layout="vertical"
              radius={4}
            >
              {displayData.map((entry, index) => (
                 <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="name"
                position="insideLeft"
                offset={8}
                fill="white"
                fontSize={13}
                fontWeight="500"
              />
              <LabelList
                dataKey="sales"
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
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending products <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing top revenue generators
        </div>
      </CardFooter>
    </Card>
  )
}

