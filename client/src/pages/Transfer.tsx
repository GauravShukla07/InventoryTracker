import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransferSchema, type InsertTransfer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Transfer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assets } = useQuery({
    queryKey: ["/api/assets"],
  });

  const form = useForm<InsertTransfer>({
    resolver: zodResolver(insertTransferSchema),
    defaultValues: {
      assetId: 0,
      toLocation: "",
      toCustodian: "",
      toOrganization: "",
      reason: "",
      transferDate: "",
      fromLocation: "",
      fromCustodian: "",
    },
  });

  const selectedAssetId = form.watch("assetId");
  const selectedAsset = assets?.find((asset: any) => asset.id === selectedAssetId);

  const transferAssetMutation = useMutation({
    mutationFn: async (data: InsertTransfer) => {
      const response = await apiRequest("POST", "/api/transfers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      form.reset();
      toast({
        title: "Transfer completed",
        description: "Asset has been successfully transferred",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer asset",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTransfer) => {
    transferAssetMutation.mutate(data);
  };

  const availableAssets = assets?.filter((asset: any) => 
    asset.status === "active" || asset.status === "transferred"
  ) || [];

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Transfer Assets</CardTitle>
            <CardDescription>
              Move assets between locations and update records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              <SelectValue placeholder="Choose asset to transfer" />
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
                    name="transferDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transfer Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedAsset && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Current Location Information</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Current Location:</span>{" "}
                        {selectedAsset.currentLocation}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Current Custodian:</span>{" "}
                        {selectedAsset.handoverPerson || "Not assigned"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Organization:</span>{" "}
                        {selectedAsset.handoverOrganization || "Not specified"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground">New Location Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="toLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Location Address *</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="Enter complete new address..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="toCustodian"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Custodian Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Full name of new custodian" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="toOrganization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Organization</FormLabel>
                          <FormControl>
                            <Input placeholder="Organization name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transfer Reason</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="Reason for transfer..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => form.reset()}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={transferAssetMutation.isPending || !selectedAsset}
                  >
                    {transferAssetMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Process Transfer
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
