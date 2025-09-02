import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

interface SignupData {
  companyName: string;
  companySlug: string;
  companyEmail: string;
  companyDomain: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
  plan: string;
  billingInterval: string;
}

interface Plan {
  monthly: number;
  yearly: number;
  limits: {
    users: number;
    projects: number;
    storage: number;
  };
  features: {
    [key: string]: boolean;
  };
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--background)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    padding: '2rem 1rem',
    fontFamily: 'var(--font-sans)'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: 'var(--text-secondary)'
  },
  form: {
    maxWidth: '500px',
    margin: '0 auto',
    background: 'var(--surface)',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-subtle)'
  },
  section: {
    marginBottom: '2rem'
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '1rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '1rem',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    boxSizing: 'border-box' as const
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '1rem',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    boxSizing: 'border-box' as const
  },
  button: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--brand-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '1rem'
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    marginBottom: '1rem'
  },
  planDetails: {
    background: 'var(--background-secondary)',
    padding: '1rem',
    borderRadius: '8px',
    marginTop: '1rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  link: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '1rem',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    marginTop: '1rem'
  }
};

export const CompanySignup: React.FC = () => {
  const [formData, setFormData] = useState<SignupData>({
    companyName: '',
    companySlug: '',
    companyEmail: '',
    companyDomain: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerFirstName: '',
    ownerLastName: '',
    plan: 'starter',
    billingInterval: 'monthly'
  });
  const [plans, setPlans] = useState<{ [key: string]: Plan }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await apiService.getPlans();
      setPlans(response.plans);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      if (name === 'companyName') {
        newData.companySlug = generateSlug(value);
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiService.signup(formData);
      
      if (response.token) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        throw new Error(response.error || 'Signup failed');
      }
    } catch (error: any) {
      setError(error.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans[formData.plan];
  const pricing = selectedPlan?.[formData.billingInterval as keyof Pick<Plan, 'monthly' | 'yearly'>];

  if (success) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ fontSize: '4rem', color: 'var(--success)', marginBottom: '1rem' }}>✓</div>
          <h2 style={styles.title}>Welcome to TimeBeacon!</h2>
          <p style={styles.subtitle}>
            Your account has been created successfully. Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Create Your TimeBeacon Account</h2>
        <p style={styles.subtitle}>Start your 14-day free trial today</p>
      </div>

      <div style={styles.form}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Company Information</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="companyName">Company Name</label>
              <input
                style={styles.input}
                id="companyName"
                name="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Acme Corp"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="companySlug">Company URL</label>
              <input
                style={styles.input}
                id="companySlug"
                name="companySlug"
                type="text"
                required
                value={formData.companySlug}
                onChange={handleInputChange}
                placeholder="acme-corp"
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                timebeacon.app/{formData.companySlug || 'your-company'}
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="companyEmail">Company Email</label>
              <input
                style={styles.input}
                id="companyEmail"
                name="companyEmail"
                type="email"
                required
                value={formData.companyEmail}
                onChange={handleInputChange}
                placeholder="admin@acme.com"
              />
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Owner Account</h3>
            
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="ownerFirstName">First Name</label>
                <input
                  style={styles.input}
                  id="ownerFirstName"
                  name="ownerFirstName"
                  type="text"
                  required
                  value={formData.ownerFirstName}
                  onChange={handleInputChange}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="ownerLastName">Last Name</label>
                <input
                  style={styles.input}
                  id="ownerLastName"
                  name="ownerLastName"
                  type="text"
                  required
                  value={formData.ownerLastName}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="ownerEmail">Email Address</label>
              <input
                style={styles.input}
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                required
                value={formData.ownerEmail}
                onChange={handleInputChange}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="ownerPassword">Password</label>
              <input
                style={styles.input}
                id="ownerPassword"
                name="ownerPassword"
                type="password"
                required
                minLength={6}
                value={formData.ownerPassword}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Choose Your Plan</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="plan">Plan</label>
              <select
                style={styles.select}
                id="plan"
                name="plan"
                value={formData.plan}
                onChange={handleInputChange}
              >
                {Object.entries(plans).map(([planKey, planData]) => (
                  <option key={planKey} value={planKey}>
                    {planKey.charAt(0).toUpperCase() + planKey.slice(1)} - ${planData[formData.billingInterval as keyof Pick<Plan, 'monthly' | 'yearly'>]}/{formData.billingInterval}
                  </option>
                ))}
              </select>
            </div>

            {selectedPlan && (
              <div style={styles.planDetails}>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Plan Details</h4>
                <ul style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <li>• {selectedPlan.limits.users === -1 ? 'Unlimited' : selectedPlan.limits.users} users</li>
                  <li>• {selectedPlan.limits.projects === -1 ? 'Unlimited' : selectedPlan.limits.projects} projects</li>
                  <li>• {selectedPlan.limits.storage}GB storage</li>
                </ul>
                <div style={{ marginTop: '0.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  ${pricing}/{formData.billingInterval} + 14-day free trial
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Creating Account...' : 'Start Free Trial'}
          </button>

          <a href="/login" style={styles.link}>
            Already have an account? Sign in
          </a>
        </form>
      </div>
    </div>
  );
};