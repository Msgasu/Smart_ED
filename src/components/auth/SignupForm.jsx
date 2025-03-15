import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import PasswordField from './PasswordField';
import toast from 'react-hot-toast';

const SignupForm = ({ selectedRole, validateRole }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    date_of_birth: '',
    address: '',
    // Role-specific fields
    student_id: '',
    class_year: '',
    department: '',
    position: '',
    relation_to_student: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      if (!validateRole()) return;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile data
        const profileData = {
          id: authData.user.id,
          email: formData.email.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          role: selectedRole,
          phone_number: formData.phone_number ? formData.phone_number.replace(/\D/g, '') : null,
          date_of_birth: formData.date_of_birth || null,
          address: formData.address ? formData.address.trim() : null,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([profileData], {
            onConflict: 'id',
            returning: 'minimal'
          });

        if (profileError) throw profileError;

        // Add role-specific data to the appropriate table
        if (selectedRole === 'student') {
          const studentData = {
            profile_id: authData.user.id,
            student_id: formData.student_id ? formData.student_id.trim() : null,
            class_year: formData.class_year ? formData.class_year.trim() : null
          };
          
          const { error: studentError } = await supabase
            .from('students')
            .upsert([studentData], {
              onConflict: 'profile_id',
              returning: 'minimal'
            });
            
          if (studentError) throw studentError;
        } 
        else if (selectedRole === 'faculty') {
          const facultyData = {
            profile_id: authData.user.id,
            department: formData.department ? formData.department.trim() : null,
            position: formData.position ? formData.position.trim() : null
          };
          
          const { error: facultyError } = await supabase
            .from('faculty')
            .upsert([facultyData], {
              onConflict: 'profile_id',
              returning: 'minimal'
            });
            
          if (facultyError) throw facultyError;
        } 
        else if (selectedRole === 'guardian') {
          const guardianData = {
            profile_id: authData.user.id
          };
          
          const { error: guardianError } = await supabase
            .from('guardians')
            .upsert([guardianData], {
              onConflict: 'profile_id',
              returning: 'minimal'
            });
            
          if (guardianError) throw guardianError;
        }

        // Sign out the user after successful registration
        await supabase.auth.signOut();
        
        // Navigate to signin page
        navigate('/signin');
        toast.success('Registration successful! Please sign in.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Registration failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Render role-specific fields
  const renderRoleFields = () => {
    if (selectedRole === 'student') {
      return (
        <div className="role-fields">
          <h4>Student Information</h4>
          <div className="mb-3">
            <label htmlFor="student_id" className="form-label">Student ID</label>
            <input
              type="text"
              className="form-control"
              id="student_id"
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="class_year" className="form-label">Class Year</label>
            <input
              type="text"
              className="form-control"
              id="class_year"
              name="class_year"
              value={formData.class_year}
              onChange={handleChange}
            />
          </div>
        </div>
      );
    } else if (selectedRole === 'faculty') {
      return (
        <div className="role-fields">
          <h4>Faculty Information</h4>
          <div className="mb-3">
            <label htmlFor="department" className="form-label">Department</label>
            <input
              type="text"
              className="form-control"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="position" className="form-label">Position</label>
            <input
              type="text"
              className="form-control"
              id="position"
              name="position"
              value={formData.position}
              onChange={handleChange}
            />
          </div>
        </div>
      );
    } else if (selectedRole === 'guardian') {
      return (
        <div className="role-fields">
          <h4>Guardian Information</h4>
          <div className="mb-3">
            <label htmlFor="relation_to_student" className="form-label">Relation to Student</label>
            <input
              type="text"
              className="form-control"
              id="relation_to_student"
              name="relation_to_student"
              value={formData.relation_to_student}
              onChange={handleChange}
            />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <><form onSubmit={handleSubmit}>
      <h2 className="form-title">Create Account</h2>

      <div className="mb-3">
        <label htmlFor="email" className="form-label">Email</label>
        <input
          type="email"
          className="form-control"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required />
      </div>

      <PasswordField
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })} />

      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label htmlFor="first_name" className="form-label">First Name</label>
            <input
              type="text"
              className="form-control"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required />
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label htmlFor="last_name" className="form-label">Last Name</label>
            <input
              type="text"
              className="form-control"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required />
          </div>
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="phone_number" className="form-label">Phone Number</label>
        <input
          type="tel"
          className="form-control"
          id="phone_number"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange} />
      </div>

      <div className="mb-3">
        <label htmlFor="date_of_birth" className="form-label">Date of Birth</label>
        <input
          type="date"
          className="form-control"
          id="date_of_birth"
          name="date_of_birth"
          value={formData.date_of_birth}
          onChange={handleChange} />
      </div>

      <div className="mb-3">
        <label htmlFor="address" className="form-label">Address</label>
        <input
          type="text"
          className="form-control"
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange} />
      </div>

      {renderRoleFields()}

      <button type="submit" className="btn btn-login" disabled={loading}>
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
            {/* Add the "Already have an account" link */}
            <div className="mt-3 text-center">
        Already have an account? <Link to="/signin" className="text-primary">Sign in</Link>
      </div>
    </form>
    
    </>
  );
};

export default SignupForm;