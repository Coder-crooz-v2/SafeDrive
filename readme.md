
## Overview

SafeDrive is a comprehensive driving safety application designed to enhance road safety through real-time monitoring, accident detection, and driver assistance features. The application combines multiple technologies to create a holistic safety experience for drivers and a powerful management system for fleet administrators. [Live link](https://safedrive-1.onrender.com)

## Core Features

### User Features

#### 1. User Authentication System
- Secure login/signup functionality
- Profile management with personal and vehicle details
- Token-based authentication with JWT
- Session management with refresh tokens

#### 2. Driver Dashboard
- Central hub for all driver information
- Profile display and management
- Driving mode toggle
- Access to safety features and monitoring tools

#### 3. Driving Mode
- Activatable driving mode that enables safety monitoring features
- Real-time status indication when active
- Toggleable interface to start/stop monitoring

#### 4. Real-time Location Tracking
- GPS-based location monitoring
- Speed calculation and display
- Current location identification and mapping
- Nearby accident detection within configurable radius

#### 5. Speed Monitoring and Alerts
- Real-time speed tracking and display
- Overspeeding detection based on defined thresholds (80 km/h default)
- Visual and audio alerts when speed limits are exceeded
- Speed data recording for safety analysis

#### 6. Drowsiness Detection
- Real-time facial monitoring for signs of drowsiness
- Integration with device camera
- Alert system for drowsy driving detection
- Periodic drowsiness checks during active driving

#### 7. Accident Detection System
- Accelerometer-based sudden motion (jerk) detection
- Automatic accident detection algorithms
- Emergency contact notification in case of detected accidents
- Test simulation feature for system verification

#### 8. Navigation and Mapping
- Live map display showing current location
- Route planning and navigation
- Integration with mapping services
- Accident-prone area visualization

#### 9. Emergency Response System
- Automatic emergency alerts when accidents are detected
- Emergency contact management
- Location sharing with emergency contacts
- SMS/notification dispatching in emergency situations

#### 10. Driver Monitoring Interface
- Dashboard for real-time driving statistics
- Tab-based interface for different monitoring aspects
- Visual indicators for speed, location, and safety status
- Alert system for potential dangers

### Administrator Features

#### 1. Admin Authentication System
- Secure admin login functionality
- Company profile management
- Role-based access control
- JWT-based admin authentication

#### 2. Admin Dashboard
- Comprehensive overview of all client drivers
- Company profile information display
- Client management tools
- Analytics and reporting features

#### 3. Client Management
- View and manage all registered client drivers
- Search and filter functionality for clients
- Client profile viewing capabilities
- Client data export options

#### 4. Analytics and Reporting
- Accident data visualization and analysis
- Driver behavior statistics and trends
- Risk assessment based on driving patterns
- Visual charts for data interpretation

#### 5. Company Profile Management
- Update company information
- Manage admin account settings
- Change authentication credentials
- Configure notification preferences

## How the App Works

### Initialization and Authentication

#### For Drivers
1. Users register with personal details and vehicle information
2. Secure login with JWT token-based authentication
3. Token validation on app startup to maintain sessions

#### For Administrators
1. Admins register with company name and contact information
2. Secure admin login with JWT authentication
3. Access to complete client management dashboard

### Driver Dashboard Experience
1. Upon login, users are presented with the driver dashboard
2. Dashboard displays profile information and driving statistics
3. Toggle switch enables/disables driving mode
4. Profile management options available via dashboard

### Admin Dashboard Experience
1. Upon login, admins access the comprehensive admin dashboard
2. Dashboard shows company profile and active client count
3. Tab-based interface for dashboard and analytics views
4. Client management tools for monitoring all registered drivers

### Active Driving Mode
1. When driving mode is activated:
   - Location tracking begins using device GPS
   - Speed monitoring becomes active
   - Drowsiness detection initializes (if camera access granted)
   - Accident detection systems are activated

2. Real-time monitoring includes:
   - Current speed display with overspeeding alerts
   - Location tracking on live map
   - Accelerometer data processing for jerk detection
   - Facial monitoring for drowsiness signs

### Safety Features in Action
1. Overspeeding Detection:
   - Compares current speed against threshold (80 km/h)
   - Provides visual warnings and alerts when limit exceeded

2. Drowsiness Detection:
   - Analyzes driver's face for signs of drowsiness
   - Issues alerts when drowsy patterns detected

3. Accident Detection:
   - Monitors accelerometer for sudden changes in acceleration
   - Detects potential accidents based on motion analysis
   - Triggers emergency protocols when accidents detected

4. Emergency Response:
   - Automatically notifies emergency contacts with location data
   - Sends alerts with accident details and coordinates
   - Provides emergency instructions to driver and contacts
   - Notifies admin dashboard of accident events

### Admin Analytics and Monitoring
1. Client Accident Monitoring:
   - Real-time accident data collection from client devices
   - Visual representation of accident locations and details
   - Filtering options for accident data analysis
   - Detailed accident reports with victim information

2. Driver Performance Analysis:
   - Overspeeding incidents tracking
   - Drowsiness detection statistics
   - Accident history for each driver
   - Gemini based AI Risk assessment based on driving patterns
   - Gemini based chatbot on admin side for a smooth an uninterrupted experience

### Data Management
1. Location and driving data stored in Redux state management
2. User profile information persisted in database
3. Accident history recording for safety analysis and insurance claim reviews
4. Emergency contact information management
5. Client data management for company administrators

## Technical Implementation
The application is built using:
- React with TypeScript for the frontend
- Redux for state management
- Express.js backend for API services
- MongoDB for data persistence
- JWT for authentication
- Geolocation APIs for location tracking
- Device sensors (accelerometer, gyroscope) for motion detection
- Camera integration with opencv and mediapipe for drowsiness detection
- Role-based access control for admin and user separation
- Gemini API for AI analysis and chatbot features

## Safety Testing
The application includes a "Test Accident Detection" feature that allows users to simulate an accident scenario for testing the emergency response system without actually experiencing an accident. This testing mechanism also populates the admin dashboard with test data for demonstration purposes.
