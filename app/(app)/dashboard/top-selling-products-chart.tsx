"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Loader2 } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts"

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

export const description = "A mixed bar chart"

type ProductData = {
  name: string
  quantity: number
  totalRevenue: number
  fill: string
}

export function TopSellingProductsChart() {
  const [data, setData] = useState<ProductData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
        try {
            const res = await fetch('/api/sales/top-products')
            const result = await res.json()
            if (result.success) {
                // Map data to include chart colors
                const dataWithColors = result.data.map((item: any, index: number) => ({
                    ...item,
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
  }, [])

  const chartConfig = {
    quantity: {
      label: "Quantity Sold",
    },
    ...data.reduce((acc, item, index) => {
        acc[item.name] = {
            label: item.name,
            color: item.fill,
        }
        return acc
    }, {} as Record<string, { label: string; color: string }>)
  } satisfies ChartConfig

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
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>No sales data available yet.</CardDescription>
            </CardHeader>
        </Card>
      )
  }

  return (
    <Card className="glass-card border-none shadow-sm h-full">
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
        <CardDescription>Top 5 products by quantity sold</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{
              left: 0,
            }}
          >
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={100} 
              tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
            />
            <XAxis dataKey="quantity" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="quantity" layout="vertical" radius={5}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Top product makes up {Math.round((data[0]?.quantity / data.reduce((a,b)=>a+b.quantity, 0)) * 100)}% of these sales <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing top 5 best selling items
        </div>
      </CardFooter>
    </Card>
  )
}
