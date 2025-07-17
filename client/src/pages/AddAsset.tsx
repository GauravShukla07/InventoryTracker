import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAssetSchema, type InsertAsset } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AddAsset() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertAsset>({
    resolver: zodResolver(insertAssetSchema),
    defaultValues: {
      voucherNo: "",
      date: "",
      donor: "",
      currentLocation: "",
      lostQuantity: 0,
      lostAmount: "0",
      handoverPerson: "",
      handoverOrganization: "",
      transferRecipient: "",
      transferLocation: "",
      isDonated: undefined,
      projectName: "",
      isInsured: undefined,
      policyNumber: "",
      warranty: "",
      warrantyValidity: "",
      grn: "",
      status: "active",
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: InsertAsset) => {
      const response = await apiRequest("POST", "/api/assets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      form.reset();
      toast({
        title: "Asset added successfully",
        description: "The asset has been added to your inventory",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add asset",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAsset) => {
    createAssetMutation.mutate(data);
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Add New Asset</CardTitle>
            <CardDescription>
              Enter comprehensive asset information for inventory tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Information */}
                <div className="form-section">
                  <h3 className="form-section-title">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="voucherNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voucher Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="VCH-2024-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="donor"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Donor/Source of Funding *</FormLabel>
                          <FormControl>
                            <Input placeholder="Organization name or funding source" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Location Information */}
                <div className="form-section">
                  <h3 className="form-section-title">Location Information</h3>
                  <FormField
                    control={form.control}
                    name="currentLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Location/Address of Assets *</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={3} 
                            placeholder="Enter complete address..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Loss Information */}
                <div className="form-section">
                  <h3 className="form-section-title">Loss Information (If Applicable)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="lostQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lost/Missing Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              placeholder="0" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lostAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount of Lost Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Handover Information */}
                <div className="form-section">
                  <h3 className="form-section-title">Handover Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="handoverPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Person Name (Asset Handover)</FormLabel>
                          <FormControl>
                            <Input placeholder="Person's full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="handoverOrganization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name (Asset Handover)</FormLabel>
                          <FormControl>
                            <Input placeholder="Organization name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Transfer Information */}
                <div className="form-section">
                  <h3 className="form-section-title">Transfer Information (If Applicable)</h3>
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="transferRecipient"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transfer Recipient Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Name of transfer recipient" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transferLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transfer Location Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              rows={3} 
                              placeholder="Address of transfer location..." 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Asset Status & Project Information */}
                <div className="form-section">
                  <h3 className="form-section-title">Asset Status & Project Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="isDonated"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Donated Status</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "true")} 
                            value={field.value === undefined ? "" : field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Yes - Donated</SelectItem>
                              <SelectItem value="false">No - Not Donated</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Project where asset is used" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Insurance & Warranty Information */}
                <div className="form-section">
                  <h3 className="form-section-title">Insurance & Warranty Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="isInsured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Insured</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "true")} 
                            value={field.value === undefined ? "" : field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select insurance status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Yes - Insured</SelectItem>
                              <SelectItem value="false">No - Not Insured</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="policyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Policy Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Policy number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="warranty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty Information</FormLabel>
                          <FormControl>
                            <Input placeholder="Warranty details" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="warrantyValidity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty Validity</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grn"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>GRN (Goods Receipt Note)</FormLabel>
                          <FormControl>
                            <Input placeholder="GRN number/reference" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => form.reset()}
                  >
                    Reset Form
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAssetMutation.isPending}
                  >
                    {createAssetMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Asset
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
