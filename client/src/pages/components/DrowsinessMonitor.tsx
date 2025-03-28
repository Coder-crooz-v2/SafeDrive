import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Video, RefreshCcw } from "lucide-react";
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DrowsinessMonitor = () => {
  const { isDriving } = useSelector((state: RootState) => state.driving);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringResults, setMonitoringResults] = useState({
    isDrowsy: false,
    earValue: 0,
    drowsinessPercentage: 0,
    alertSent: false,
    hasDetectedFace: false
  });
  const [webSocketError, setWebSocketError] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  // Connect to WebSocket server
  useEffect(() => {
    if(isDriving)
        setIsMonitoring(true);
    else
        setIsMonitoring(false);
  }, [isDriving]);

  useEffect(() => {
    if (isDriving && isMonitoring && !wsRef.current) {
      try {
        // Connect to the WebSocket server
        console.log("Attempting to connect to WebSocket server...");
        wsRef.current = new WebSocket('ws://localhost:8001/ws/drowsiness');
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected successfully');
          setIsConnected(true);
          setWebSocketError(null);
          toast.success("Connected to drowsiness monitoring system");
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.results) {
              setMonitoringResults(data.results);
            }
            console.log("Received data from server");
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          setWebSocketError("Failed to connect to monitoring server. Is the Python backend running?");
          toast.error("Failed to connect to monitoring server");
        };
        
        wsRef.current.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          setIsConnected(false);
          wsRef.current = null;
          
          if (event.code !== 1000) { // Normal closure
            setWebSocketError(`Connection closed (${event.code}). Please restart monitoring.`);
          }
        };
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
        setWebSocketError("Failed to setup WebSocket connection");
      }
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
      }
    };
  }, [isDriving, isMonitoring]);
  
  // Start video stream when monitoring is enabled
  useEffect(() => {
    if (isDriving && isMonitoring) {
      // Start webcam with higher quality
      navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }
      })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setVideoStream(stream);
            console.log("Webcam stream started successfully");
          }
        })
        .catch(err => {
          console.error("Error accessing webcam:", err);
          toast.error("Could not access webcam. Please check permissions.");
        });
    } else {
      // Stop webcam
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
    };
  }, [isMonitoring, isDriving]);
  
  // Send video frames to the WebSocket server
  useEffect(() => {
    if (!isConnected || !isMonitoring || !isDriving) return;
    
    console.log("Setting up frame sending interval...");
    
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
        // Check if video is actually playing and has dimensions
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          console.log("Video not ready yet, waiting...");
          return;
        }
        
        const context = canvasRef.current.getContext('2d');
        if (context) {
          try {
            // Set canvas dimensions to match video
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            
            // Draw video frame to canvas
            context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Get base64 encoded image data with higher quality
            const imageData = canvasRef.current.toDataURL('image/jpeg', 0.9);
            
            // Send to WebSocket server
            wsRef.current.send(JSON.stringify({ frame: imageData }));
          } catch (error) {
            console.error("Error capturing or sending frame:", error);
          }
        }
      }
    }, 150); // Approximately 6-7 fps
    
    return () => clearInterval(interval);
  }, [isConnected, isMonitoring, isDriving]);
  
  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setWebSocketError(null);
    
    // Short delay before reconnecting
    setTimeout(() => {
      setIsMonitoring(true);
    }, 500);
  };
  
  if (!isDriving) {
    return null; // Don't show when not driving
  }
  
  // Determine alert level for status indicators
  const getAlertLevel = () => {
    if (monitoringResults.isDrowsy) return "high";
    if (monitoringResults.drowsinessPercentage > 50) return "medium";
    if (monitoringResults.drowsinessPercentage > 20) return "low";
    return "none";
  };
  
  const alertLevel = getAlertLevel();
  
  return (
    <Card className={`mt-4 ${alertLevel === 'high' ? 'border-red-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Drowsiness Monitoring</CardTitle>
          <div className="flex space-x-2">
            {isMonitoring && !isConnected && (
              <Button 
                variant="outline"
                size="sm"
                onClick={reconnect}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reconnect
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isMonitoring ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Live Video Feed */}
              <div className="bg-gray-50 p-2 rounded-lg">
                <div className="relative rounded overflow-hidden border">
                  {webSocketError && !isConnected ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 bg-opacity-80 z-10 p-4">
                      <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
                      <p className="text-center text-sm text-red-500 font-medium">
                        {webSocketError}
                      </p>
                    </div>
                  ) : null}
                  
                  <video 
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto"
                  />
                  
                  {/* Status Indicators */}
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <Badge 
                      variant={isConnected ? "default" : "destructive"}
                      className={`${!isConnected && "animate-pulse"}`}
                    >
                      {isConnected ? "Connected" : "Disconnected"}
                    </Badge>
                    
                    {isConnected && monitoringResults.hasDetectedFace && (
                      <Badge 
                        variant="outline" 
                        className={
                          alertLevel === "high" ? "bg-red-100 text-red-700 border-red-300" :
                          alertLevel === "medium" ? "bg-amber-100 text-amber-700 border-amber-300" :
                          "bg-green-100 text-green-700 border-green-300"
                        }
                      >
                        {
                          alertLevel === "high" ? "Drowsy!" :
                          alertLevel === "medium" ? "Drowsy Warning" :
                          alertLevel === "low" ? "Slightly Drowsy" :
                          "Alert"
                        }
                      </Badge>
                    )}
                  </div>
                  
                  {/* Face Detection Indicator */}
                  {isConnected && (
                    <div className="absolute bottom-2 left-2">
                      <Badge 
                        variant="outline" 
                        className={`
                          ${monitoringResults.hasDetectedFace 
                            ? "bg-green-100 text-green-700 border-green-300" 
                            : "bg-amber-100 text-amber-700 border-amber-300 animate-pulse"}
                        `}
                      >
                        {monitoringResults.hasDetectedFace ? "Face Detected" : "No Face Detected"}
                      </Badge>
                    </div>
                  )}
                  
                  {/* EAR Value Indicator */}
                  {isConnected && monitoringResults.hasDetectedFace && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                      EAR: {monitoringResults.earValue.toFixed(2)}
                    </div>
                  )}
                </div>
                
                {/* Hidden canvas for frame capture */}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              {/* Drowsiness Stats */}
              <div className="space-y-4">
                {isConnected ? (
                  <>
                    {/* Connection and Status */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h3 className="text-sm font-medium mb-2">Monitoring Status</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm">Connection</span>
                        </div>
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full mr-2 ${monitoringResults.hasDetectedFace ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                          <span className="text-sm">Face Detection</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* EAR Value */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Eye Aspect Ratio (EAR)</span>
                        <span 
                          className={`text-sm font-medium ${
                            monitoringResults.earValue < EYE_AR_THRESH ? 'text-red-500' : 'text-green-500'
                          }`}
                        >
                          {monitoringResults.earValue.toFixed(2)}
                        </span>
                      </div>
                      <Progress 
                        value={monitoringResults.earValue * 100} 
                        max={50}
                        className={monitoringResults.earValue < EYE_AR_THRESH ? 'bg-red-100' : 'bg-gray-100'} 
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        When below {EYE_AR_THRESH}, eyes are considered closed
                      </p>
                    </div>
                    
                    {/* Drowsiness Percentage */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Drowsiness Level</span>
                        <span 
                          className={`text-sm font-medium ${
                            monitoringResults.drowsinessPercentage > 50 ? 'text-red-500' : 
                            monitoringResults.drowsinessPercentage > 20 ? 'text-amber-500' : 'text-green-500'
                          }`}
                        >
                          {monitoringResults.drowsinessPercentage.toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={monitoringResults.drowsinessPercentage} 
                        className={
                          monitoringResults.drowsinessPercentage > 75 ? 'bg-red-500' : 
                          monitoringResults.drowsinessPercentage > 50 ? 'bg-amber-500' : 
                          monitoringResults.drowsinessPercentage > 0 ? 'bg-amber-300' : 'bg-green-500'
                        }
                      />
                    </div>
                    
                    {/* Drowsiness Alert */}
                    {monitoringResults.isDrowsy && (
                      <Alert variant="destructive" className="animate-pulse">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Drowsiness Detected!</AlertTitle>
                        <AlertDescription>
                          You appear to be drowsy. Please pull over safely and take a break.
                          {monitoringResults.alertSent && (
                            <p className="mt-2 font-semibold">
                              Emergency contacts have been notified.
                            </p>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500">
                    <h3 className="font-medium mb-2">Connection Status</h3>
                    <p>Cannot connect to the drowsiness detection server.</p>
                    <p className="mt-2">Make sure the Python backend is running on port 8001.</p>
                    <code className="block mt-2 bg-gray-100 p-2 rounded text-xs">
                      python drowsiness_server.py
                    </code>
                    
                    <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      <p className="font-medium mb-1">Even without server connection:</p>
                      <p>The live camera feed is still visible so you can monitor yourself.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Video className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Drowsiness monitoring is disabled.</p>
            <p className="text-sm mt-2">
              Enable monitoring to detect signs of drowsiness while driving.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Constants from Python backend
const EYE_AR_THRESH = 0.25;

export default DrowsinessMonitor;