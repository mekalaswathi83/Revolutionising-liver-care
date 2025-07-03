import React, { useState } from 'react';
import PatientForm from './components/PatientForm';
import PredictionResults from './components/PredictionResults';
import Analytics from './components/Analytics';
import ModelExplainability from './components/ModelExplainability';
import { 
  Activity, 
  BarChart2, 
  Brain, 
  Home, 
  PlusCircle, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  History,
  FileDown,
  BookOpen,
  Download,
  ChevronLeft,
  Menu,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';

interface PatientData {
  age: number;
  gender: string;
  bilirubin: number;
  albumin: number;
  platelets: number;
  copper?: number;
  alkaline_phosphatase?: number;
  sgot?: number;
  prothrombin?: number;
  history_of_alcohol: boolean;
  hepatitis: boolean;
  diabetes: boolean;
}

interface PredictionResult {
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendations: string[];
  timestamp: string;
  features: {
    bilirubin: number;
    albumin: number;
    platelets: number;
    copper: number;
    alkaline_phosphatase: number;
    sgot: number;
    prothrombin: number;
  };
  confidence: number;
}

interface PatientHistory {
  id: string;
  timestamp: string;
  patientData: PatientData;
  predictionResult: PredictionResult;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'form' | 'results' | 'analytics' | 'insights' | 'history' | 'guidelines'>('dashboard');
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [patientHistory, setPatientHistory] = useState<PatientHistory[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PatientHistory | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const generateRecommendations = (score: number, data: PatientData): string[] => {
    const recommendations: string[] = [];
    
    if (score >= 75) {
      recommendations.push('Immediate medical consultation recommended');
      recommendations.push('Regular liver function monitoring required');
      recommendations.push('Consider liver biopsy and advanced imaging (MRI/CT)');
      recommendations.push('Screen for hepatocellular carcinoma every 6 months');
      recommendations.push('Implement strict alcohol cessation program');
    } else if (score >= 50) {
      recommendations.push('Schedule follow-up appointment within 3 months');
      recommendations.push('Consider lifestyle modifications');
      recommendations.push('Repeat liver function tests in 3 months');
      recommendations.push('Consider hepatology consultation');
      recommendations.push('Monitor for symptom development');
    } else {
      recommendations.push('Continue regular health maintenance');
      recommendations.push('Annual liver function assessment recommended');
      recommendations.push('Maintain healthy lifestyle habits');
      recommendations.push('Monitor for any symptom changes');
      recommendations.push('Follow up in 12 months');
    }

    if (data.bilirubin > 2.0) {
      recommendations.push('High bilirubin levels detected - further testing recommended');
    }
    
    if (data.albumin < 3.5) {
      recommendations.push('Low albumin levels - dietary consultation recommended');
    }
    
    if (data.platelets < 150) {
      recommendations.push('Low platelet count - regular monitoring required');
    }
    
    if (data.history_of_alcohol) {
      recommendations.push('Consider alcohol cessation program');
    }

    if (data.hepatitis) {
      recommendations.push('Follow up with hepatologist for hepatitis management');
    }

    if (data.diabetes) {
      recommendations.push('Ensure proper diabetes management and monitoring');
    }
    
    return recommendations;
  };

  const handlePredict = async (formData: PatientData) => {
    console.log('Received form data in App.tsx:', formData);
    
    try {
      // Calculate risk score based on multiple factors
      let riskScore = 0;
      let confidence = 90; // Base confidence
      
      // Lab values contribution (normalized to 0-1 scale)
      if (formData.bilirubin > 2.0) riskScore += 2;
      if (formData.albumin < 3.5) riskScore += 2;
      if (formData.platelets < 150) riskScore += 1.5;
      
      // Additional lab values if available
      if (formData.alkaline_phosphatase && formData.alkaline_phosphatase > 200) {
        riskScore += 1;
        confidence += 2;
      }
      if (formData.sgot && formData.sgot > 40) {
        riskScore += 1;
        confidence += 2;
      }
      if (formData.prothrombin && formData.prothrombin > 12) {
        riskScore += 1.5;
        confidence += 2;
      }
      
      // Medical history factors
      if (formData.history_of_alcohol) riskScore += 2;
      if (formData.hepatitis) riskScore += 1.5;
      if (formData.diabetes) riskScore += 1;
      
      // Age factor
      if (formData.age > 60) riskScore += 1;
      if (formData.age > 70) riskScore += 0.5;
      
      // Normalize final score to 0-100 scale
      const normalizedScore = Math.min(Math.round((riskScore / 15) * 100), 100);
      
      console.log('Calculated risk score:', normalizedScore);
      
      // Create prediction result
      const result: PredictionResult = {
        riskScore: normalizedScore,
        riskLevel: normalizedScore >= 75 ? 'High' : normalizedScore >= 50 ? 'Medium' : 'Low',
        recommendations: generateRecommendations(normalizedScore, formData),
      timestamp: new Date().toISOString(),
        confidence: Math.min(confidence, 98), // Cap confidence at 98%
      features: {
          bilirubin: formData.bilirubin,
          albumin: formData.albumin,
          platelets: formData.platelets,
          copper: formData.copper || 0,
          alkaline_phosphatase: formData.alkaline_phosphatase || 0,
          sgot: formData.sgot || 0,
          prothrombin: formData.prothrombin || 0
        }
      };
      
      console.log('Setting prediction result:', result);
      
      // Add to patient history
      const historyItem: PatientHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        patientData: formData,
        predictionResult: result
      };
      setPatientHistory(prev => [historyItem, ...prev]);
      
      setPredictionResult(result);
      setCurrentView('results');
      
    } catch (error) {
      console.error('Error generating prediction:', error);
      throw error;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportData = async () => {
    try {
      const doc = new jsPDF();
      let yPos = 20;
      const lineHeight = 10;
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 139); // Dark blue
      doc.text('LiverCare AI - Patient Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += lineHeight * 2;

      // Authorization Header
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100); // Gray
      doc.text('Authorized Medical Assessment Tool', pageWidth / 2, yPos, { align: 'center' });
      yPos += lineHeight;
      doc.text('© 2024 Bhavishya. All Rights Reserved.', pageWidth / 2, yPos, { align: 'center' });
      yPos += lineHeight * 2;

      // Current Date
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100); // Gray
      doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += lineHeight * 2;

      // Current Assessment (if available)
      if (predictionResult) {
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Current Assessment', margin, yPos);
        yPos += lineHeight;

        doc.setFontSize(12);
        doc.text(`Risk Score: ${predictionResult.riskScore}`, margin, yPos);
        yPos += lineHeight;
        doc.text(`Risk Level: ${predictionResult.riskLevel}`, margin, yPos);
        yPos += lineHeight;
        doc.text(`Confidence: ${predictionResult.confidence}%`, margin, yPos);
        yPos += lineHeight * 1.5;

        // Recommendations
        doc.setFontSize(14);
        doc.text('Recommendations:', margin, yPos);
        yPos += lineHeight;
        doc.setFontSize(12);
        predictionResult.recommendations.forEach(rec => {
          // Check if we need a new page
          if (yPos > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(`• ${rec}`, margin, yPos);
          yPos += lineHeight;
        });
        yPos += lineHeight;
      }

      // Patient History
      if (patientHistory.length > 0) {
        // Add a new page for history
        doc.addPage();
        yPos = margin;

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Assessment History', margin, yPos);
        yPos += lineHeight * 1.5;

        doc.setFontSize(12);
        patientHistory.forEach((item, index) => {
          // Check if we need a new page
          if (yPos > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            yPos = margin;
          }

          doc.setTextColor(0, 0, 139); // Dark blue
          doc.text(`Assessment ${index + 1} - ${formatDate(item.timestamp)}`, margin, yPos);
          yPos += lineHeight;

          doc.setTextColor(0, 0, 0);
          doc.text(`Risk Score: ${item.predictionResult.riskScore}`, margin + 10, yPos);
          yPos += lineHeight;
          doc.text(`Risk Level: ${item.predictionResult.riskLevel}`, margin + 10, yPos);
          yPos += lineHeight;
          doc.text(`Confidence: ${item.predictionResult.confidence}%`, margin + 10, yPos);
          yPos += lineHeight * 1.5;
        });
      }

      // Add copyright and authorization footer to each page
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        
        // Page number
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'center' }
        );
        
        // Copyright and authorization
        doc.text(
          'This document is generated by an authorized medical assessment tool.',
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 15,
          { align: 'center' }
        );
        doc.text(
          '© 2024 Bhavishya. All Rights Reserved. Unauthorized use or distribution is prohibited.',
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      doc.save('liver-cirrhosis-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report');
    }
  };

  const getViewTitle = (view: string) => {
    switch (view) {
      case 'dashboard': return 'Dashboard';
      case 'form': return 'New Assessment';
      case 'results': return 'Prediction Results';
      case 'analytics': return 'Analytics';
      case 'insights': return 'Model Insights';
      case 'history': return 'Patient History';
      case 'guidelines': return 'Medical Guidelines';
      default: return '';
    }
  };

  const renderMobileHeader = () => (
    <div className="bg-white shadow-sm lg:hidden">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {currentView !== 'dashboard' && (
              <button
                onClick={() => setCurrentView('dashboard')}
                className="mr-3 p-2 rounded-full hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
            )}
            <span className="text-lg font-semibold text-gray-900">
              {getViewTitle(currentView)}
            </span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="px-2 pt-2 pb-3 space-y-1">
          <button
            onClick={() => {
              setCurrentView('dashboard');
              setIsMobileMenuOpen(false);
            }}
            className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
              currentView === 'dashboard'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <Home className="h-5 w-5 mr-3" />
              Dashboard
            </div>
          </button>
          <button
            onClick={() => {
              setCurrentView('form');
              setIsMobileMenuOpen(false);
            }}
            className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
              currentView === 'form'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <PlusCircle className="h-5 w-5 mr-3" />
              New Assessment
            </div>
          </button>
          <button
            onClick={() => {
              setCurrentView('history');
              setIsMobileMenuOpen(false);
            }}
            className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
              currentView === 'history'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <History className="h-5 w-5 mr-3" />
              History
            </div>
          </button>
          <button
            onClick={() => {
              setCurrentView('analytics');
              setIsMobileMenuOpen(false);
            }}
            className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
              currentView === 'analytics'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <BarChart2 className="h-5 w-5 mr-3" />
              Analytics
            </div>
          </button>
          <button
            onClick={() => {
              setCurrentView('insights');
              setIsMobileMenuOpen(false);
            }}
            className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
              currentView === 'insights'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <Brain className="h-5 w-5 mr-3" />
              Model Insights
            </div>
          </button>
          <button
            onClick={() => {
              setCurrentView('guidelines');
              setIsMobileMenuOpen(false);
            }}
            className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
              currentView === 'guidelines'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <BookOpen className="h-5 w-5 mr-3" />
              Guidelines
            </div>
          </button>

          {/* Mobile Quick Actions */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="space-y-2">
              <button
                onClick={() => {
                  exportData();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium bg-green-50 text-green-700"
              >
                <FileDown className="h-5 w-5 mr-3" />
                Export Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Welcome to LiverCare AI</h1>
            <p className="text-gray-600 mb-6">Your advanced liver cirrhosis prediction platform</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-2">Quick Start</h2>
                <p className="text-gray-600 mb-4">Begin a new patient assessment</p>
                <button
                  onClick={() => setCurrentView('form')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Start Assessment
                </button>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-2">Recent Activity</h2>
                <p className="text-gray-600 mb-4">View your recent predictions</p>
                <button
                  onClick={() => setCurrentView('analytics')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  View Analytics
                </button>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-2">Patient History</h2>
                <p className="text-gray-600 mb-4">Access previous assessments</p>
                <button
                  onClick={() => setCurrentView('history')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  View History
                </button>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-2">Medical Guidelines</h2>
                <p className="text-gray-600 mb-4">Access clinical guidelines</p>
                <button
                  onClick={() => setCurrentView('guidelines')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  View Guidelines
                </button>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="flex space-x-4">
                <button
                  onClick={exportData}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <FileDown className="h-5 w-5 mr-2" />
                  Export Data
                </button>
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Patient History</h2>
            <div className="space-y-4">
              {patientHistory.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedHistoryItem(item);
                    setPredictionResult(item.predictionResult);
                    setCurrentView('results');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                      <p className="font-medium">
                        Risk Score: {item.predictionResult.riskScore}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      item.predictionResult.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                      item.predictionResult.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.predictionResult.riskLevel} Risk
                    </div>
                  </div>
                </div>
              ))}
              {patientHistory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No history available yet. Complete an assessment to see it here.
                </div>
              )}
            </div>
          </div>
        );

      case 'guidelines':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Medical Guidelines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Assessment Guidelines</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Collect complete patient history including alcohol consumption and medical conditions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Ensure all laboratory tests are recent (within last 3 months)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Document any family history of liver disease</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Risk Level Guidelines</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">High Risk (75-100)</h4>
                    <p className="text-sm text-red-700">Immediate medical consultation required. Consider hospitalization if symptoms are severe.</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">Medium Risk (50-74)</h4>
                    <p className="text-sm text-yellow-700">Schedule follow-up within 1-2 weeks. Monitor symptoms closely.</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Low Risk (0-49)</h4>
                    <p className="text-sm text-green-700">Regular check-ups recommended. Maintain healthy lifestyle.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'form':
        return <PatientForm onPredict={handlePredict} />;
      case 'results':
        return predictionResult ? (
          <PredictionResults 
            result={predictionResult} 
            onBack={() => setCurrentView('form')} 
          />
        ) : (
          <div className="p-6 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Prediction Available</h3>
              <p className="text-gray-500 mb-4">Please complete a patient assessment first.</p>
              <button
                onClick={() => setCurrentView('form')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Start New Assessment
              </button>
            </div>
          </div>
        );
      case 'analytics':
        return <Analytics />;
      case 'insights':
        return <ModelExplainability data={predictionResult} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Desktop Navigation */}
      <nav className="glass-effect sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  LiverCare AI
                </h1>
              </div>

              {/* Navigation Links */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('form')}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'form'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Assessment
                </button>
                <button
                  onClick={() => setCurrentView('history')}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'history'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </button>
                <button
                  onClick={() => setCurrentView('analytics')}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'analytics'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Analytics
                </button>
                <button
                  onClick={() => setCurrentView('insights')}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'insights'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Model Insights
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="hidden sm:flex sm:items-center">
              <button
                onClick={exportData}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white gradient-bg hover:opacity-90 transition-opacity card-hover"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export Report
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="sm:hidden">
        <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute inset-0 bg-black bg-opacity-25" onClick={() => setIsMobileMenuOpen(false)} />
          <div className={`fixed inset-y-0 right-0 w-72 bg-white shadow-xl transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="pt-5 pb-6">
              <div className="flex items-center justify-between px-4">
                <div className="font-semibold text-gray-800">Menu</div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-md p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-6 px-4 space-y-3">
                <button
                  onClick={() => {
                    setCurrentView('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Home className="h-5 w-5 mr-3" />
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setCurrentView('form');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <PlusCircle className="h-5 w-5 mr-3" />
                  New Assessment
                </button>
                <button
                  onClick={() => {
                    setCurrentView('history');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <History className="h-5 w-5 mr-3" />
                  History
                </button>
                <button
                  onClick={() => {
                    setCurrentView('analytics');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <BarChart2 className="h-5 w-5 mr-3" />
                  Analytics
                </button>
                <button
                  onClick={() => {
                    setCurrentView('insights');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Brain className="h-5 w-5 mr-3" />
                  Model Insights
                </button>
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      exportData();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white gradient-bg hover:opacity-90"
                  >
                    <FileDown className="h-5 w-5 mr-3" />
                    Export Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="fade-in">
          {/* View Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{getViewTitle(currentView)}</h2>
            <p className="mt-2 text-gray-600">
              {currentView === 'form' && 'Enter patient details for liver cirrhosis assessment'}
              {currentView === 'results' && 'Review the AI-powered assessment results'}
              {currentView === 'analytics' && 'Analyze historical patient data and trends'}
              {currentView === 'insights' && 'Understand how the AI makes predictions'}
              {currentView === 'dashboard' && 'Overview of patient assessments and analytics'}
              {currentView === 'history' && 'View past patient assessments and their outcomes'}
            </p>
          </div>

          {/* Content Cards */}
          <div className="slide-in">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 card-hover">
          {renderContent()}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-effect mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="text-base font-medium text-gray-900">
              Authorized Medical Assessment Tool
            </div>
            <div className="text-sm text-gray-600">
              © {new Date().getFullYear()} Bhavishya. All Rights Reserved.
            </div>
            <div className="text-xs text-gray-500">
              Unauthorized use or distribution is prohibited.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;