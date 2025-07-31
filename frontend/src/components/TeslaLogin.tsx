import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const TeslaLogin = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      fetch('http://localhost:3000/api/tesla/auth', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json',
        },
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to authenticate with Tesla');
          return res.json();
        })
        .then(data => {
          console.log('Tesla Vehicles:', data);
          setError(null);
          navigate('/search');
        })
        .catch(err => {
          console.error('Tesla Auth Error:', err);
          setError(err.message);
        });
    }
  }, [code, navigate]);

  const handleTeslaLogin = () => {
    const clientId = process.env.REACT_APP_TESLA_CLIENT_ID;
    if (!clientId) {
      setError('Tesla Client ID is missing');
      return;
    }
    window.location.href = `https://auth.tesla.com/oauth2/v3/authorize?client_id=${clientId}&redirect_uri=https://driveway-hub.app/auth/callback&response_type=code&scope=vehicle:read`;
  };

  return (
    <div className="p-4">
      <button
        onClick={handleTeslaLogin}
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
        disabled={!process.env.REACT_APP_TESLA_CLIENT_ID}
      >
        Connect Tesla Account
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default TeslaLogin;