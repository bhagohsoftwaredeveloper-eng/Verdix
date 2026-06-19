export function SectionHeader({ title, icon: Icon }: { title: string, icon: any }) {
    return (
        <div className="flex items-center gap-2 pb-2 border-b mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        </div>
    )
}
