import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ArrowLeftRight, Wrench, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { data: assets } = useQuery({
    queryKey: ["/api/assets"],
  });

  const { data: repairs } = useQuery({
    queryKey: ["/api/repairs/active"],
  });

  const { data: transfers } = useQuery({
    queryKey: ["/api/transfers"],
  });

  const totalAssets = assets?.length || 0;
  const activeRepairs = repairs?.length || 0;
  const totalTransfers = transfers?.length || 0;
  const activeAssets = assets?.filter((asset: any) => asset.status === "active").length || 0;

  const stats = [
    {
      title: "Total Assets",
      value: totalAssets,
      description: `${activeAssets} active`,
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Active Repairs",
      value: activeRepairs,
      description: "Currently under repair",
      icon: Wrench,
      color: "text-amber-600",
    },
    {
      title: "Total Transfers",
      value: totalTransfers,
      description: "All time transfers",
      icon: ArrowLeftRight,
      color: "text-green-600",
    },
    {
      title: "Asset Utilization",
      value: `${totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0}%`,
      description: "Assets in active use",
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your inventory management system
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Assets</CardTitle>
              <CardDescription>
                Latest additions to inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assets && assets.length > 0 ? (
                <div className="space-y-4">
                  {assets.slice(0, 5).map((asset: any) => (
                    <div key={asset.id} className="flex items-center justify-between border-b border-border pb-2 last:border-b-0">
                      <div>
                        <p className="font-medium">{asset.voucherNo}</p>
                        <p className="text-sm text-muted-foreground">{asset.donor}</p>
                      </div>
                      <div className="text-right">
                        <span className={`status-badge ${
                          asset.status === "active" ? "status-active" :
                          asset.status === "transferred" ? "status-transferred" :
                          asset.status === "in_repair" ? "status-in-repair" :
                          "status-disposed"
                        }`}>
                          {asset.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No assets found. Start by adding your first asset.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Repairs</CardTitle>
              <CardDescription>
                Assets currently under maintenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repairs && repairs.length > 0 ? (
                <div className="space-y-4">
                  {repairs.slice(0, 5).map((repair: any) => (
                    <div key={repair.id} className="flex items-center justify-between border-b border-border pb-2 last:border-b-0">
                      <div>
                        <p className="font-medium">Repair #{repair.id}</p>
                        <p className="text-sm text-muted-foreground">{repair.issue}</p>
                      </div>
                      <div className="text-right">
                        <span className={`status-badge ${
                          repair.status === "in_repair" ? "status-in-repair" :
                          repair.status === "diagnosed" ? "bg-blue-100 text-blue-800" :
                          "bg-green-100 text-green-800"
                        }`}>
                          {repair.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No active repairs. All assets are functioning properly.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
