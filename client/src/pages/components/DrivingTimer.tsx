// Create a separate DrivingTimer.tsx file
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { updateElapsedTime } from '../../redux/slices/drivingSlice';

export const DrivingTimer = () => {
  const dispatch = useDispatch();
  const { isDriving, elapsedTime } = useSelector((state: RootState) => state.driving);
  
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isDriving) {
      timer = setInterval(() => {
        dispatch(updateElapsedTime(elapsedTime + 1));
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isDriving, elapsedTime, dispatch]);
  
  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };
  
  return (
    <div className="text-2xl font-mono font-bold text-center py-2">
      {formatTime(elapsedTime)}
    </div>
  );
};

export default DrivingTimer;