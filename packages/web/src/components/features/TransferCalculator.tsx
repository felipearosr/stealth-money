import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TransferCalculator() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Send Money</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* You Send Section */}
        <div className="space-y-2">
          <Label htmlFor="send-amount">You Send</Label>
          <div className="flex space-x-2">
            <Input
              id="send-amount"
              type="number"
              placeholder="0.00"
              className="flex-1"
            />
            <Select defaultValue="USD">
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="BRL">BRL</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Recipient Gets Section */}
        <div className="space-y-2">
          <Label htmlFor="receive-amount">Recipient Gets</Label>
          <div className="flex space-x-2">
            <Input
              id="receive-amount"
              type="number"
              placeholder="0.00"
              className="flex-1"
            />
            <Select defaultValue="BRL">
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="BRL">BRL</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fee and Rate Details */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Exchange Rate:</span>
            <span>1 USD = 5.15 BRL</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Fee:</span>
            <span>$2.99</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total to pay:</span>
            <span className="font-semibold">$102.99</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Continue</Button>
      </CardFooter>
    </Card>
  );
}