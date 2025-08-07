import React, { useState } from 'react';

export const SettingsWorking: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Settings Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Name:</label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ 
            marginLeft: '10px', 
            padding: '5px',
            border: '1px solid #ccc'
          }}
        />
        <div>Current value: {name}</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>Email:</label>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ 
            marginLeft: '10px', 
            padding: '5px',
            border: '1px solid #ccc'
          }}
        />
        <div>Current value: {email}</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={slackEnabled}
            onChange={(e) => setSlackEnabled(e.target.checked)}
          />
          Slack Notifications
        </label>
        <div>Slack enabled: {slackEnabled ? 'YES' : 'NO'}</div>
      </div>

      <button onClick={() => console.log({ name, email, slackEnabled })}>
        Log Values
      </button>
    </div>
  );
};