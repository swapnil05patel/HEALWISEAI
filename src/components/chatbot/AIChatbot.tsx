import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, User, Bot, Loader2, X, Mic, Volume2, VolumeX } from "lucide-react";

// Enhanced Machine Learning Context Interface
interface MLContext {
  symptoms: string[];
  severity: 'low' | 'moderate' | 'high';
  duration: number; // in days
  relatedConditions: string[];
}

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  mlContext?: MLContext;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    text: "Hello! I'm your advanced AI health assistant powered by machine learning. Describe your symptoms in detail, and I'll provide personalized insights.",
    sender: "bot",
    timestamp: new Date(),
  },
];

// Simulated Machine Learning Model
class HealthAssistantML {
  private static symptomDatabase = {
    // Respiratory System
    'cough': { 
      conditions: [
        'common cold', 'flu', 'bronchitis', 'pneumonia', 
        'asthma', 'chronic obstructive pulmonary disease (COPD)', 
        'lung cancer', 'tuberculosis', 'COVID-19'
      ],
      riskFactors: ['smoking', 'air pollution', 'weak immune system', 'age', 'chronic conditions']
    },
    'shortness of breath': {
      conditions: [
        'asthma', 'COPD', 'heart failure', 'pneumonia', 
        'pulmonary embolism', 'anxiety disorder', 'lung cancer'
      ],
      riskFactors: ['obesity', 'smoking', 'high altitude', 'heart conditions']
    },

    // Neurological System
    'headache': { 
      conditions: [
        {
          name: 'migraine',
          symptoms: ['intense throbbing pain', 'nausea', 'light sensitivity', 'visual disturbances'],
          solutions: [
            'Prescription migraine medications',
            'Preventive medications',
            'Stress management',
            'Regular sleep schedule',
            'Avoiding known triggers'
          ],
          severity: 'moderate-high',
          diagnosticTests: ['Neurological exam', 'MRI', 'CT scan']
        },
        {
          name: 'tension headache',
          symptoms: ['dull, aching head pain', 'pressure around forehead', 'scalp tenderness'],
          solutions: [
            'Over-the-counter pain relievers',
            'Stress reduction techniques',
            'Massage',
            'Improved posture',
            'Regular exercise'
          ],
          severity: 'low',
          diagnosticTests: ['Physical examination', 'Stress assessment']
        }
      ],
      riskFactors: ['stress', 'dehydration', 'lack of sleep', 'genetics', 'hormonal changes']
    },
    'dizziness': {
      conditions: [
        'vertigo', 'inner ear infection', 'low blood pressure', 
        'anemia', 'multiple sclerosis', 'brain tumor', 'stroke'
      ],
      riskFactors: ['age', 'medications', 'dehydration', 'blood sugar fluctuations']
    },

    // Cardiovascular System
    'chest pain': {
      conditions: [
        'heart attack', 'angina', 'myocarditis', 'pericarditis', 
        'pulmonary embolism', 'costochondritis', 'anxiety'
      ],
      riskFactors: ['high cholesterol', 'smoking', 'obesity', 'diabetes', 'family history']
    },
    'irregular heartbeat': {
      conditions: [
        'arrhythmia', 'atrial fibrillation', 'heart valve disease', 
        'thyroid disorders', 'electrolyte imbalance'
      ],
      riskFactors: ['age', 'heart disease', 'high blood pressure', 'caffeine', 'stress']
    },

    // Digestive System
    'stomach pain': {
      conditions: [
        {
          name: 'gastritis',
          symptoms: ['burning sensation in stomach', 'nausea', 'indigestion'],
          solutions: [
            'Antacids and acid reducers',
            'Avoid spicy and acidic foods',
            'Stress management',
            'Antibiotics if H. pylori bacteria is present'
          ],
          severity: 'moderate',
          diagnosticTests: ['Endoscopy', 'Blood tests', 'Stool tests']
        },
        {
          name: 'appendicitis',
          symptoms: ['severe right-side abdominal pain', 'fever', 'nausea'],
          solutions: [
            'Immediate surgical intervention (appendectomy)',
            'Antibiotics',
            'Hospital observation'
          ],
          severity: 'high',
          diagnosticTests: ['CT scan', 'Ultrasound', 'Blood tests']
        },
        {
          name: 'irritable bowel syndrome (IBS)',
          symptoms: ['abdominal cramping', 'bloating', 'constipation', 'diarrhea'],
          solutions: [
            'Dietary modifications',
            'Stress reduction techniques',
            'Probiotics',
            'Fiber supplements',
            'Medication for symptom management'
          ],
          severity: 'low-moderate',
          diagnosticTests: ['Colonoscopy', 'Blood tests', 'Stool analysis']
        }
      ],
      riskFactors: ['diet', 'stress', 'bacterial infections', 'autoimmune conditions']
    },
    'nausea': {
      conditions: [
        {
          name: 'food poisoning',
          symptoms: ['vomiting', 'diarrhea', 'abdominal cramps', 'fever'],
          solutions: [
            'Hydration',
            'Oral rehydration solutions',
            'Rest',
            'Bland diet',
            'Antibiotics in severe cases'
          ],
          severity: 'moderate',
          diagnosticTests: ['Stool culture', 'Blood tests']
        },
        {
          name: 'pregnancy-related nausea',
          symptoms: ['morning sickness', 'food aversions', 'fatigue'],
          solutions: [
            'Small, frequent meals',
            'Ginger supplements',
            'Vitamin B6',
            'Avoid triggers',
            'Medication under doctor\'s guidance'
          ],
          severity: 'low',
          diagnosticTests: ['Pregnancy test', 'Blood hormone levels']
        },
        {
          name: 'migraine-induced nausea',
          symptoms: ['intense headache', 'sensitivity to light', 'vomiting'],
          solutions: [
            'Prescription migraine medications',
            'Preventive medications',
            'Stress management',
            'Identifying and avoiding triggers',
            'Relaxation techniques'
          ],
          severity: 'moderate-high',
          diagnosticTests: ['Neurological examination', 'MRI', 'CT scan']
        }
      ],
      riskFactors: ['diet', 'medications', 'pregnancy', 'travel', 'chemotherapy']
    },

    // Infectious Diseases
    'fever': {
      conditions: [
        'viral infection', 'bacterial infection', 'flu', 
        'COVID-19', 'malaria', 'dengue', 'typhoid', 
        'autoimmune disorders'
      ],
      riskFactors: [
        'low immunity', 'recent travel', 'exposure to sick people', 
        'poor hygiene', 'chronic conditions'
      ]
    },

    // Endocrine System
    'weight changes': {
      conditions: [
        'thyroid disorders', 'diabetes', 'metabolic syndrome', 
        'Cushing\'s syndrome', 'hormonal imbalance'
      ],
      riskFactors: ['genetics', 'diet', 'lifestyle', 'stress', 'medications']
    },

    // Musculoskeletal System
    'joint pain': {
      conditions: [
        'arthritis', 'rheumatoid arthritis', 'osteoarthritis', 
        'lupus', 'fibromyalgia', 'gout', 'bursitis'
      ],
      riskFactors: ['age', 'obesity', 'previous injuries', 'genetics', 'repetitive stress']
    }
  };

  static analyzeSymptoms(userInput: string): MLContext {
    const input = userInput.toLowerCase();
    const symptoms = Object.keys(this.symptomDatabase)
      .filter(symptom => input.includes(symptom));

    const severity = symptoms.length > 1 ? 'high' : 
                     symptoms.length === 1 ? 'moderate' : 'low';

    return {
      symptoms,
      severity,
      duration: this.extractDuration(input),
      relatedConditions: symptoms.flatMap(symptom => 
        this.symptomDatabase[symptom]?.conditions.flatMap(condition => condition.name) || []
      )
    };
  }

  private static extractDuration(input: string): number {
    const durationMatches = input.match(/(\d+)\s*(day|week|month|hour)s?/i);
    return durationMatches ? parseInt(durationMatches[1]) : 1;
  }

  static generateAdvancedResponse(context: MLContext): string {
    if (context.symptoms.length === 0) {
      return "I noticed you haven't specified any clear symptoms. Could you provide more details about what you're experiencing?";
    }

    const severityMap = {
      'low': "Your symptoms appear mild.",
      'moderate': "Your symptoms suggest a potential health concern.",
      'high': "Your symptoms indicate a more serious condition that requires attention."
    };

    const recommendationMap = {
      'low': "Consider rest, hydration, and over-the-counter remedies.",
      'moderate': "Monitor your symptoms and consult a healthcare professional if they persist or worsen.",
      'high': "Strongly recommend immediate medical consultation or emergency care."
    };

    const possibleConditions = context.relatedConditions.length > 0 
      ? `Possible conditions include: ${context.relatedConditions.join(', ')}.` 
      : "Unable to determine specific conditions.";

    return `${severityMap[context.severity]} ${possibleConditions} 
    Symptoms duration: ${context.duration} day(s). 
    ${recommendationMap[context.severity]} 
    Disclaimer: This is an AI-generated recommendation and should not replace professional medical advice.`;
  }
}

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const recognitionRef = useRef<globalThis.SpeechRecognition | null>(null);
  const synthRef = useRef<globalThis.SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<globalThis.SpeechSynthesisUtterance | null>(null);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Check if browser supports Web Speech API
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (utteranceRef.current) {
        synthRef.current?.cancel();
      }
    };
  }, []);

  // Speak the bot's response
  const speak = (text: string) => {
    if (!isSpeechEnabled || !synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new globalThis.SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Store the utterance in the ref so we can cancel it later
    utteranceRef.current = utterance;
    
    utterance.onend = () => {
      utteranceRef.current = null;
    };

    synthRef.current.speak(utterance);
  };

  // Toggle speech recognition
  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputValue('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Toggle text-to-speech
  const toggleSpeech = () => {
    const newState = !isSpeechEnabled;
    setIsSpeechEnabled(newState);
    
    // If turning off speech, stop any ongoing speech
    if (!newState && synthRef.current && utteranceRef.current) {
      synthRef.current.cancel();
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === "") return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate ML-powered response generation
    setTimeout(() => {
      const mlContext = HealthAssistantML.analyzeSymptoms(inputValue);
      const aiResponse = HealthAssistantML.generateAdvancedResponse(mlContext);

      const botMessage: Message = {
        id: messages.length + 2,
        text: aiResponse,
        sender: "bot",
        timestamp: new Date(),
        mlContext
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Speak the bot's response
      if (isSpeechEnabled) {
        speak(aiResponse);
      }
      
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating chat button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg flex items-center justify-center ${
          isOpen ? "bg-medical-red hover:bg-red-600" : "bg-medical-blue hover:bg-medical-darkblue"
        }`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat window */}
      <div
        className={`fixed bottom-24 right-6 w-80 sm:w-96 transition-all duration-300 transform origin-bottom-right ${
          isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"
        }`}
      >
        <Card className="shadow-xl border-medical-blue">
          <CardHeader className="bg-medical-blue text-white py-3 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-medium flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                AI Health Assistant
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20"
                  onClick={toggleSpeech}
                  title={isSpeechEnabled ? "Mute voice" : "Unmute voice"}
                >
                  {isSpeechEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 h-80 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender === "user"
                        ? "bg-medical-blue text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center mb-1 text-xs text-gray-500">
                      {msg.sender === "user" ? (
                        <>
                          <span className="ml-1 text-white">You</span>
                          <span className="ml-auto text-white">{formatTime(msg.timestamp)}</span>
                        </>
                      ) : (
                        <>
                          <Bot className="h-3 w-3 mr-1" />
                          <span>Health Assistant</span>
                          <span className="ml-auto">{formatTime(msg.timestamp)}</span>
                        </>
                      )}
                    </div>
                    <div className={msg.sender === "user" ? "text-white" : "text-gray-800"}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-gray-100">
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-medical-blue" />
                      <span className="text-sm text-gray-500">Typing a response...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          <CardFooter className="p-2 border-t">
            <form onSubmit={handleSendMessage} className="w-full flex gap-2">
              <div className="relative flex-grow">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your health question..."
                  className="pr-10"
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={() => setInputValue('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleListening}
                className="shrink-0"
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
              </Button>
              <Button 
                type="submit" 
                size="icon" 
                disabled={inputValue.trim() === "" || isTyping}
                className="bg-medical-blue hover:bg-medical-darkblue"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default AIChatbot;
