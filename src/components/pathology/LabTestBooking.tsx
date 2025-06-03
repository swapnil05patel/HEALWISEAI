import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileText, Microscope, Download, Stethoscope, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";

// Comprehensive list of lab tests with detailed descriptions
const labTests = [
  {
    id: "cbc",
    name: "Complete Blood Count (CBC)",
    description: "Evaluates overall health and detects a wide range of disorders",
    aiAnalysis: true,
    recommendedFrequency: "Annually"
  },
  {
    id: "lipid",
    name: "Lipid Profile",
    description: "Measures cholesterol levels and assesses cardiovascular risk",
    aiAnalysis: true,
    recommendedFrequency: "Every 2 years"
  },
  {
    id: "thyroid",
    name: "Thyroid Function Test",
    description: "Checks thyroid hormone levels and metabolic function",
    aiAnalysis: true,
    recommendedFrequency: "Every 3 years"
  },
  {
    id: "diabetes",
    name: "Diabetes Screening",
    description: "Measures blood sugar levels and assesses diabetes risk",
    aiAnalysis: true,
    recommendedFrequency: "Annually"
  },
  {
    id: "liver",
    name: "Liver Function Test",
    description: "Evaluates liver health and detects potential liver diseases",
    aiAnalysis: true,
    recommendedFrequency: "Every 2 years"
  }
];

// Comprehensive medical dataset for machine learning prediction
const MEDICAL_DATASET = {
  // Predefined medical risk profiles
  profiles: [
    {
      id: 'low_risk_young',
      age: { min: 18, max: 35 },
      conditions: ['minimal_intervention'],
      riskFactors: ['healthy_lifestyle', 'no_chronic_conditions']
    },
    {
      id: 'moderate_risk_middle_age',
      age: { min: 36, max: 55 },
      conditions: ['preventive_care', 'potential_metabolic_risks'],
      riskFactors: ['sedentary_lifestyle', 'potential_stress']
    },
    {
      id: 'high_risk_senior',
      age: { min: 56, max: 100 },
      conditions: ['comprehensive_screening', 'chronic_disease_management'],
      riskFactors: ['multiple_health_concerns', 'age_related_decline']
    }
  ],

  // Detailed questionnaire for risk assessment
  questionnaires: {
    'cbc': [
      {
        question: "Do you experience frequent fatigue?",
        type: "boolean",
        riskWeight: 0.3
      },
      {
        question: "Have you noticed any unexplained bruising or bleeding?",
        type: "boolean",
        riskWeight: 0.4
      },
      {
        question: "Do you have a family history of blood disorders?",
        type: "boolean",
        riskWeight: 0.3
      }
    ],
    'lipid': [
      {
        question: "Do you consume high-fat foods regularly?",
        type: "boolean",
        riskWeight: 0.3
      },
      {
        question: "Do you have a sedentary lifestyle?",
        type: "boolean",
        riskWeight: 0.3
      },
      {
        question: "Is there a family history of heart disease?",
        type: "boolean",
        riskWeight: 0.4
      }
    ],
    'thyroid': [
      {
        question: "Do you experience unexplained weight changes?",
        type: "boolean",
        riskWeight: 0.3
      },
      {
        question: "Do you feel constantly tired or have mood swings?",
        type: "boolean",
        riskWeight: 0.3
      },
      {
        question: "Is there a family history of thyroid disorders?",
        type: "boolean",
        riskWeight: 0.4
      }
    ],
    'diabetes': [
      {
        question: "Do you have a family history of diabetes?",
        type: "boolean",
        riskWeight: 0.4
      },
      {
        question: "Are you overweight or obese?",
        type: "boolean",
        riskWeight: 0.3
      },
      {
        question: "Do you experience frequent thirst or urination?",
        type: "boolean",
        riskWeight: 0.3
      }
    ],
    'liver': [
      {
        question: "Do you consume alcohol regularly?",
        type: "boolean",
        riskWeight: 0.3
      },
      {
        question: "Do you have any history of liver-related illnesses?",
        type: "boolean",
        riskWeight: 0.4
      },
      {
        question: "Do you take medications that might affect liver function?",
        type: "boolean",
        riskWeight: 0.3
      }
    ]
  }
};

interface PatientDetails {
  name: string;
  age: string;
  gender: string;
  email: string;
  phone: string;
  additionalNotes: string;
  frequentFatigue: string;
  unexplainedBruising: string;
  familyBloodDisorders: string;
}

const LabTestBooking = () => {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<PatientDetails>({
    name: '',
    age: '',
    gender: '',
    email: '',
    phone: '',
    additionalNotes: '',
    frequentFatigue: '',
    unexplainedBruising: '',
    familyBloodDisorders: ''
  });
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [additionalQuestions, setAdditionalQuestions] = useState<{[key: string]: any}>({});
  const [questionsAnswered, setQuestionsAnswered] = useState(false);

  const handleTestSelection = (testId: string) => {
    setSelectedTest(testId);
    setIsBookingDialogOpen(true);
  };

  const handlePatientDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPatientDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePatientDetails = () => {
    // Check only the most critical fields
    return (
      patientDetails.name.trim() !== '' && 
      patientDetails.age.trim() !== '' && 
      patientDetails.gender.trim() !== '' &&
      patientDetails.email.trim() !== '' &&
      patientDetails.phone.trim() !== ''
    );
  };

  const generateMLReport = () => {
    const { name, age, gender } = patientDetails;
    const testName = labTests.find(t => t.id === selectedTest)?.name || 'Unknown Test';

    // Determine risk profile based on age
    const ageNum = parseInt(age);
    const riskProfile = MEDICAL_DATASET.profiles.find(
      profile => ageNum >= profile.age.min && ageNum <= profile.age.max
    ) || MEDICAL_DATASET.profiles[0];

    // Calculate risk based on questionnaire responses
    const calculateQuestionnaireRisk = () => {
      if (!selectedTest) return 0;

      const testQuestions = MEDICAL_DATASET.questionnaires[selectedTest] || [];
      const questionResponses = additionalQuestions[selectedTest] || {};

      return testQuestions.reduce((totalRisk, question) => {
        const response = questionResponses[question.question];
        return response === true 
          ? totalRisk + (question.riskWeight * 30) 
          : totalRisk;
      }, 0);
    };

    const questionnaireRisk = calculateQuestionnaireRisk();

    // Comprehensive risk calculation
    const calculateRisk = () => {
      let baseRisk = 0;

      // Age-based risk
      if (ageNum < 30) baseRisk += 10;
      else if (ageNum >= 30 && ageNum < 50) baseRisk += 30;
      else baseRisk += 50;

      // Gender and test-specific risk
      if (gender === 'female') {
        if (testName.includes('Thyroid')) baseRisk += 20;
        if (testName.includes('Diabetes')) baseRisk += 15;
      } else if (gender === 'male') {
        if (testName.includes('Lipid')) baseRisk += 25;
        if (testName.includes('Liver')) baseRisk += 20;
      }

      // Add questionnaire risk
      baseRisk += questionnaireRisk;

      return Math.min(baseRisk, 100);
    };

    const riskScore = calculateRisk();
    const riskCategory = 
      riskScore < 30 ? 'Low Risk' : 
      riskScore < 60 ? 'Moderate Risk' : 
      'High Risk';

    // Generate recommendations based on risk and test type
    const generateRecommendations = () => {
      const recommendations = [];

      if (riskCategory === 'High Risk') {
        recommendations.push('Urgent consultation with a healthcare professional recommended.');
        recommendations.push('Consider comprehensive follow-up tests.');
      }

      switch (testName) {
        case 'Complete Blood Count (CBC)':
          recommendations.push('Detailed blood parameter analysis suggested.');
          break;
        case 'Lipid Profile':
          recommendations.push('Lifestyle modifications and potential medication consultation advised.');
          break;
        case 'Thyroid Function Test':
          recommendations.push('Comprehensive thyroid hormone panel recommended.');
          break;
        case 'Diabetes Screening':
          recommendations.push('Immediate lifestyle intervention and potential treatment plan.');
          break;
        case 'Liver Function Test':
          recommendations.push('Detailed liver health assessment required.');
          break;
      }

      return recommendations;
    };

    const report = {
      patientName: name,
      testName: testName,
      riskScore,
      riskCategory,
      recommendations: generateRecommendations(),
      detailedRiskFactors: {
        ageGroup: riskProfile.id,
        potentialConditions: riskProfile.conditions,
        riskFactors: riskProfile.riskFactors
      },
      generatedAt: new Date().toLocaleString(),
      disclaimer: 'AI-generated preliminary report. Professional medical consultation is essential.'
    };

    setGeneratedReport(report);
    setIsReportGenerated(true);

    return report;
  };

  const bookLabTest = async () => {
    // Existing validation
    if (!validatePatientDetails()) {
      toast.error("Please fill in all required fields (Name, Age, Gender, Email, Phone)");
      return;
    }

    // Show questionnaire if not answered
    if (!questionsAnswered) {
      toast.info("Please complete the health questionnaire");
      return;
    }

    try {
      // Generate ML report
      generateMLReport();

      toast.success("Lab Test Booked Successfully!", {
        description: `${labTests.find(t => t.id === selectedTest)?.name} has been scheduled`
      });

      setIsBookingDialogOpen(false);
    } catch (error) {
      console.error('Booking Error:', error);
      toast.error("Booking Failed", {
        description: String(error)
      });
    }
  };

  const downloadReport = () => {
    if (!generatedReport) return;

    const reportContent = `
Lab Test Report

Patient Name: ${generatedReport.patientName}
Test Name: ${generatedReport.testName}
Risk Score: ${generatedReport.riskScore}
Risk Category: ${generatedReport.riskCategory}

Recommendations:
${generatedReport.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

Generated At: ${generatedReport.generatedAt}

Disclaimer: ${generatedReport.disclaimer}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedReport.patientName}_${generatedReport.testName}_Report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    
    // Set up the document
    doc.setFontSize(16);
    doc.text("Lab Test Booking Report", 10, 10);
    
    // Patient Details
    doc.setFontSize(12);
    doc.text(`Patient Name: ${patientDetails.name}`, 10, 20);
    doc.text(`Age: ${patientDetails.age}`, 10, 30);
    doc.text(`Gender: ${patientDetails.gender}`, 10, 40);
    doc.text(`Email: ${patientDetails.email}`, 10, 50);
    doc.text(`Phone: ${patientDetails.phone}`, 10, 60);
    
    // Medical History
    doc.text("Medical History:", 10, 70);
    doc.text(`Frequent Fatigue: ${patientDetails.frequentFatigue}`, 10, 80);
    doc.text(`Unexplained Bruising: ${patientDetails.unexplainedBruising}`, 10, 90);
    doc.text(`Family Blood Disorders: ${patientDetails.familyBloodDisorders}`, 10, 100);
    
    // Test Details
    const selectedLabTest = labTests.find(t => t.id === selectedTest);
    doc.text(`Lab Test: ${selectedLabTest?.name || 'Not Selected'}`, 10, 110);
    doc.text(`Date: ${format(new Date(), 'PPP')}`, 10, 120);
    
    // Save the document
    doc.save(`LabTest_${patientDetails.name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-medical-darkblue">
          <Microscope className="mr-2 h-6 w-6" /> 
          Lab Test Booking
        </CardTitle>
        <CardDescription>
          Book advanced pathological tests with AI-powered analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6">
          {/* Lab Test Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Lab Test</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {labTests.map((test) => (
                <div 
                  key={test.id}
                  onClick={() => handleTestSelection(test.id)}
                  className={cn(
                    "border rounded-lg p-4 cursor-pointer transition-all",
                    selectedTest === test.id 
                      ? "border-medical-darkblue bg-medical-lightblue bg-opacity-20" 
                      : "hover:bg-gray-50"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{test.name}</h4>
                      <p className="text-sm text-gray-600">{test.description}</p>
                    </div>
                    {test.aiAnalysis && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        AI Analysis
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Recommended: {test.recommendedFrequency}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Details Form */}
          {selectedTest && (
            <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Book {labTests.find(t => t.id === selectedTest)?.name}</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[90vw] md:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Patient Details for {labTests.find(t => t.id === selectedTest)?.name}</DialogTitle>
                  <DialogDescription>
                    Please provide your details for the lab test.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 px-2">
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-left sm:text-right">Full Name</Label>
                    <Input 
                      id="name" 
                      name="name"
                      value={patientDetails.name}
                      onChange={handlePatientDetailsChange}
                      className="w-full sm:col-span-3" 
                      placeholder="Your Full Name" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="age" className="text-left sm:text-right">Age</Label>
                    <Input 
                      id="age" 
                      name="age"
                      type="number"
                      value={patientDetails.age}
                      onChange={handlePatientDetailsChange}
                      className="w-full sm:col-span-3" 
                      placeholder="Age" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="gender" className="text-left sm:text-right">Gender</Label>
                    <Select 
                      value={patientDetails.gender}
                      onValueChange={(value) => setPatientDetails(prev => ({
                        ...prev,
                        gender: value
                      }))}
                    >
                      <SelectTrigger className="w-full sm:col-span-3">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-left sm:text-right">Email</Label>
                    <Input 
                      id="email" 
                      name="email"
                      type="email"
                      value={patientDetails.email}
                      onChange={handlePatientDetailsChange}
                      className="w-full sm:col-span-3" 
                      placeholder="Email Address" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-left sm:text-right">Phone</Label>
                    <Input 
                      id="phone" 
                      name="phone"
                      type="tel"
                      value={patientDetails.phone}
                      onChange={handlePatientDetailsChange}
                      className="w-full sm:col-span-3" 
                      placeholder="Contact Number" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label htmlFor="additionalNotes" className="text-left sm:text-right">Notes</Label>
                    <Textarea 
                      id="additionalNotes" 
                      name="additionalNotes"
                      value={patientDetails.additionalNotes}
                      onChange={handlePatientDetailsChange}
                      className="w-full sm:col-span-3" 
                      placeholder="Additional Notes (Optional)" 
                    />
                  </div>

                  {/* Medical History Questions */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label className="text-left sm:text-right">Do you experience frequent fatigue?</Label>
                    <Select 
                      value={patientDetails.frequentFatigue}
                      onValueChange={(value) => setPatientDetails(prev => ({
                        ...prev,
                        frequentFatigue: value
                      }))}
                    >
                      <SelectTrigger className="w-full sm:col-span-3">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label className="text-left sm:text-right">Have you noticed any unexplained bruising or bleeding?</Label>
                    <Select 
                      value={patientDetails.unexplainedBruising}
                      onValueChange={(value) => setPatientDetails(prev => ({
                        ...prev,
                        unexplainedBruising: value
                      }))}
                    >
                      <SelectTrigger className="w-full sm:col-span-3">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label className="text-left sm:text-right">Do you have a family history of blood disorders?</Label>
                    <Select 
                      value={patientDetails.familyBloodDisorders}
                      onValueChange={(value) => setPatientDetails(prev => ({
                        ...prev,
                        familyBloodDisorders: value
                      }))}
                    >
                      <SelectTrigger className="w-full sm:col-span-3">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Questionnaire Section */}
                  {selectedTest && MEDICAL_DATASET.questionnaires[selectedTest] && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold text-medical-darkblue mb-4">
                        Additional Health Questionnaire for {labTests.find(t => t.id === selectedTest)?.name}
                      </h3>
                      {MEDICAL_DATASET.questionnaires[selectedTest]?.map((q, index) => (
                        <div key={index} className="mb-4 flex justify-between items-center">
                          <span className="text-sm">{q.question}</span>
                          <div className="space-x-2">
                            <Button 
                              variant={additionalQuestions[selectedTest]?.[q.question] === true ? "default" : "outline"}
                              onClick={() => {
                                setAdditionalQuestions(prev => ({
                                  ...prev,
                                  [selectedTest]: {
                                    ...(prev[selectedTest] || {}),
                                    [q.question]: true
                                  }
                                }));
                              }}
                            >
                              Yes
                            </Button>
                            <Button 
                              variant={additionalQuestions[selectedTest]?.[q.question] === false ? "default" : "outline"}
                              onClick={() => {
                                setAdditionalQuestions(prev => ({
                                  ...prev,
                                  [selectedTest]: {
                                    ...(prev[selectedTest] || {}),
                                    [q.question]: false
                                  }
                                }));
                              }}
                            >
                              No
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={() => {
                      // Validate form
                      if (!validatePatientDetails()) {
                        toast.error("Please fill in all required fields (Name, Age, Gender, Email, Phone)");
                        return;
                      }
                      
                      // Medical history questions are now optional
                      
                      // Generate PDF and potentially submit booking
                      generatePDFReport();
                      
                      // Close dialog
                      setIsBookingDialogOpen(false);
                    }}
                  >
                    Confirm Booking
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LabTestBooking;
