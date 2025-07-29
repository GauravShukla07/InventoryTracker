import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRepairSchema, type InsertRepair } from "@shared/schema-new";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Clock, Wrench } from "lucide-react";

export default function Repair() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assets } = useQuery({
    queryKey: ["/api/assets"],
    queryFn: async () => {
      const response = await apiRequest("/api/assets");
      return response.json();
    },
  });

  const { data: activeRepairs } = useQuery({
    queryKey: ["/api/repairs/active"],
    queryFn: async () => {
      const response = await apiRequest("/api/repairs/active");
      return response.json();
    },
  });

  const form = useForm<InsertRepair>({
    resolver: zodResolver(insertRepairSchema),
    defaultValues: {
      assetId: 0,
      description: "",
      vendor: "",
      repairDate: new Date(),
      status: "pending",
    },
  });

  const sendForRepairMutation = useMutation({
    mutationFn: async (data: InsertRepair) => {
      const response = await apiRequest("/api/repairs", { method: "POST", body: data });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs/active"] });
      form.reset();
      toast({
        title: "Asset sent for repair",
        description: "The asset has been marked as under repair",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send asset for repair",
        variant: "destructive",
      });
    },
  });

  const completeRepairMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/repairs/${id}`, {
        method: "PUT",
        body: {
          status: "completed",
          completedDate: new Date(),
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs/active"] });
      toast({
        title: "Repair completed",
        description: "Asset has been marked as repaired and returned to active status",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete repair",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertRepair) => {
    sendForRepairMutation.mutate(data);
  };

  const availableAssets = Array.isArray(assets) ? assets.filter((asset: any) => 
    asset.status === "active" || asset.status === "transferred"
  ) : [];

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      in_repair: "status-in-repair",
      diagnosed: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    };
    
    return (
      <span className={`status-badge ${statusClasses[status as keyof typeof statusClasses] || "bg-gray-100 text-gray-800"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getAssetById = (id: number) => {
    return Array.isArray(assets) ? assets.find((asset: any) => asset.id === id) : undefined;
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send for Repair Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send Asset for Repair</CardTitle>
              <CardDescription>
                Record assets that need maintenance or repair
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="assetId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Asset *</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose asset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableAssets.map((asset: any) => (
                              <SelectItem key={asset.id} value={asset.id.toString()}>
                                {asset.voucherNo} - {asset.donor}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="Describe the issue..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repair Vendor</FormLabel>
                          <FormControl>
                            <Input placeholder="Repair vendor name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="repairDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repair Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    disabled={sendForRepairMutation.isPending}
                  >
                    {sendForRepairMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send for Repair
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Active Repairs List */}
          <Card>
            <CardHeader>
              <CardTitle>Assets Under Repair</CardTitle>
              <CardDescription>
                Track assets currently being maintained
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(activeRepairs) && activeRepairs.length > 0 ? (
                <div className="space-y-4">
                  {activeRepairs.map((repair: any) => {
                    const asset = getAssetById(repair.assetId);
                    return (
                      <div key={repair.id} className="border border-border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-foreground">
                            {asset?.voucherNo || `Asset #${repair.assetId}`}
                          </h4>
                          {getStatusBadge(repair.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium">Issue:</span> {repair.description}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {repair.vendor && (
                            <p>
                              <span className="font-medium">Vendor:</span> {repair.vendor}
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Repair Date:</span> {formatDate(repair.repairDate)}
                          </p>
                          {repair.completedDate && (
                            <p>
                              <span className="font-medium">Completed:</span> {formatDate(repair.completedDate)}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => completeRepairMutation.mutate(repair.id)}
                            disabled={completeRepairMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Mark Complete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Update Status",
                                description: "Status update functionality not implemented yet",
                              });
                            }}
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            Update Status
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No active repairs</h3>
                  <p className="text-muted-foreground">
                    All assets are functioning properly
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
