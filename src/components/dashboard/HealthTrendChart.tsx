import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";

interface HealthMetric {
  date: string;
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  bloodSugar: number;
}

const HealthTrendChart = () => {
  // Prediction function to generate future metrics
  const predictNextDaysMetrics = (currentMetrics: any) => {
    // Simple prediction logic with some randomness
    const predict = (currentValue: number, variability: number) => {
      // Add some randomness to simulate prediction
      const variation = (Math.random() - 0.5) * variability;
      return Math.max(0, currentValue + variation);
    };

    return {
      heartRate: predict(currentMetrics.heartRate, 5),
      bloodPressureSystolic: predict(currentMetrics.bloodPressureSystolic, 3),
      bloodPressureDiastolic: predict(currentMetrics.bloodPressureDiastolic, 3),
      bloodSugar: predict(currentMetrics.bloodSugar, 2)
    };
  };

  // Get current day of the week
  const getCurrentDay = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date().getDay()];
  };

  // Generate initial health data with current day first and predictions
  const generateInitialHealthData = () => {
    const currentDay = getCurrentDay();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Rotate the array so current day is first
    const rotatedDays = days.slice(days.indexOf(currentDay)).concat(days.slice(0, days.indexOf(currentDay)));
    
    // Start with zeros
    let baseMetrics = {
      heartRate: 0,
      bloodPressureSystolic: 0,
      bloodPressureDiastolic: 0,
      bloodSugar: 0
    };

    return rotatedDays.map((day, index) => {
      if (index === 0) {
        // First day uses actual stored metrics
        return {
          date: day,
          heartRate: 0,
          bloodPressureSystolic: 0,
          bloodPressureDiastolic: 0,
          bloodSugar: 0
        };
      } else {
        // Subsequent days use prediction
        const predictedMetrics = predictNextDaysMetrics(baseMetrics);
        baseMetrics = predictedMetrics;
        return {
          date: day,
          ...predictedMetrics
        };
      }
    });
  };

  const [healthData, setHealthData] = useState<HealthMetric[]>(generateInitialHealthData());

  useEffect(() => {
    const updateHealthData = () => {
      const storedMetrics = localStorage.getItem('healthMetrics');
      const currentDay = getCurrentDay();
      
      if (storedMetrics) {
        try {
          const parsedMetrics = JSON.parse(storedMetrics);
          
          // Update the first day (current day) with stored metrics
          const updatedHealthData = generateInitialHealthData();
          updatedHealthData[0] = {
            date: currentDay,
            heartRate: parseFloat(parsedMetrics.heartRate) || 0,
            bloodPressureSystolic: parseFloat(parsedMetrics.bloodPressureSystolic) || 0,
            bloodPressureDiastolic: parseFloat(parsedMetrics.bloodPressureDiastolic) || 0,
            bloodSugar: parseFloat(parsedMetrics.bloodSugar) || 0
          };

          setHealthData(updatedHealthData);
        } catch (error) {
          console.error("Error parsing health metrics:", error);
        }
      }
    };

    // Initial update
    updateHealthData();

    // Add custom event listener
    const handleStorageChange = (e: CustomEvent) => {
      updateHealthData();
    };

    // @ts-ignore
    window.addEventListener('healthMetricsUpdate', handleStorageChange);

    // Cleanup listener
    return () => {
      // @ts-ignore
      window.removeEventListener('healthMetricsUpdate', handleStorageChange);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="bg-medical-lightblue bg-opacity-50 border-b">
        <CardTitle className="flex items-center text-medical-darkblue">
          <Activity className="mr-2 h-5 w-5" />
          Health Trends (with Predictions)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={healthData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
                tickLine={{ stroke: '#ccc' }}
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fontSize: 12 }} 
                tickLine={{ stroke: '#ccc' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[60, 140]} 
                tick={{ fontSize: 12 }} 
                tickLine={{ stroke: '#ccc' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px', 
                  border: '1px solid #eaeaea',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bloodPressureSystolic"
                name="BP (Systolic)"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bloodPressureDiastolic"
                name="BP (Diastolic)"
                stroke="#0d9488"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="heartRate"
                name="Heart Rate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bloodSugar"
                name="Blood Sugar"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          Predicted Health Metrics for the Week
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthTrendChart;
