import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowDown, ArrowUp, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  change: number;
  status: "normal" | "warning" | "critical" | "improved";
  icon: React.ReactNode;
}

const HealthMetricsCard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState({
    heartRate: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    bloodSugar: '',
    weight: '',
    height: ''
  });

  const [metrics, setMetrics] = useState<HealthMetric[]>([
    {
      name: "Heart Rate",
      value: 72,
      unit: "bpm",
      change: -3,
      status: "normal",
      icon: <Heart />
    },
    // Other metrics can be added similarly
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setHealthMetrics(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const predictHealth = async () => {
    try {
      // Validate all metrics before storing
      const metricsToStore = {
        heartRate: healthMetrics.heartRate || '',
        bloodPressureSystolic: healthMetrics.bloodPressureSystolic || '',
        bloodPressureDiastolic: healthMetrics.bloodPressureDiastolic || '',
        bloodSugar: healthMetrics.bloodSugar || '',
        weight: healthMetrics.weight || '',
        height: healthMetrics.height || ''
      };

      // Check if any required fields are empty
      const requiredFields = ['heartRate', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'bloodSugar', 'weight', 'height'];
      const emptyFields = requiredFields.filter(field => !metricsToStore[field]);

      if (emptyFields.length > 0) {
        toast.error('Missing Health Metrics', {
          description: `Please fill in all fields: ${emptyFields.join(', ')}`
        });
        return;
      }

      // Store entered metrics in localStorage with detailed logging
      console.log('Storing health metrics:', metricsToStore);
      localStorage.setItem('healthMetrics', JSON.stringify(metricsToStore));

      // Dispatch custom event to trigger chart update
      const event = new CustomEvent('healthMetricsUpdate');
      window.dispatchEvent(event);

      // Verify storage
      const storedMetrics = localStorage.getItem('healthMetrics');
      console.log('Stored metrics verification:', storedMetrics);

      const response = await fetch('http://localhost:8000/api/predict-health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metricsToStore)
      });

      console.log('Prediction API Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Prediction API Error:', errorText);
        throw new Error(`Health prediction failed: ${errorText}`);
      }

      const prediction = await response.json();
      
      toast.info(`Health Prediction: ${prediction.summary}`, {
        description: prediction.details
      });

      setIsModalOpen(false);
    } catch (error) {
      console.error('Comprehensive error in predictHealth:', error);
      toast.error('Failed to predict health metrics', { 
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal": return "text-medical-green";
      case "warning": return "text-amber-500";
      case "critical": return "text-medical-red";
      case "improved": return "text-medical-blue";
      default: return "text-gray-500";
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="bg-medical-lightblue bg-opacity-50 border-b flex justify-between items-center">
          <CardTitle className="text-medical-darkblue">Health Metrics</CardTitle>
          <Button onClick={() => setIsModalOpen(true)}>
            Collect Health Metrics
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {metrics.map((metric, index) => (
              <div key={index} className={`p-4 border-r border-b flex flex-col items-center ${getStatusColor(metric.status)}`}>
                {metric.icon}
                <span className="font-bold">{metric.value} {metric.unit}</span>
                <span className="text-sm">{metric.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Health Metrics</DialogTitle>
            <DialogDescription>
              Please enter your current health metrics
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="heartRate" className="text-right">Heart Rate</Label>
              <Input 
                id="heartRate" 
                name="heartRate" 
                type="number" 
                placeholder="Beats per minute" 
                value={healthMetrics.heartRate}
                onChange={handleInputChange}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bloodPressureSystolic" className="text-right">Blood Pressure (Systolic)</Label>
              <Input 
                id="bloodPressureSystolic" 
                name="bloodPressureSystolic" 
                type="number" 
                placeholder="Systolic pressure" 
                value={healthMetrics.bloodPressureSystolic}
                onChange={handleInputChange}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bloodPressureDiastolic" className="text-right">Blood Pressure (Diastolic)</Label>
              <Input 
                id="bloodPressureDiastolic" 
                name="bloodPressureDiastolic" 
                type="number" 
                placeholder="Diastolic pressure" 
                value={healthMetrics.bloodPressureDiastolic}
                onChange={handleInputChange}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bloodSugar" className="text-right">Blood Sugar</Label>
              <Input 
                id="bloodSugar" 
                name="bloodSugar" 
                type="number" 
                placeholder="Blood sugar level" 
                value={healthMetrics.bloodSugar}
                onChange={handleInputChange}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="weight" className="text-right">Weight</Label>
              <Input 
                id="weight" 
                name="weight" 
                type="number" 
                placeholder="Weight in kg" 
                value={healthMetrics.weight}
                onChange={handleInputChange}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="height" className="text-right">Height</Label>
              <Input 
                id="height" 
                name="height" 
                type="number" 
                placeholder="Height in cm" 
                value={healthMetrics.height}
                onChange={handleInputChange}
                className="col-span-3" 
              />
            </div>
          </div>
          <Button type="button" onClick={predictHealth}>
            Predict Health
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HealthMetricsCard;
