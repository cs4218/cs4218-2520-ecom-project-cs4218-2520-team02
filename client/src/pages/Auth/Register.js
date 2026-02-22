import React, { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/AuthStyles.css";
const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [DOB, setDOB] = useState("");
  const [answer, setAnswer] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // form function
  const handleSubmit = async (e) => {
    e.preventDefault();

    // validation
    const err = {};
    if (!name.trim()) {
      err.name = "Name is required";
    }
    // Source - https://stackoverflow.com/a/9204568
    // Posted by C. Lee, modified by community. See post 'Timeline' for change history
    // Retrieved 2026-02-23, License - CC BY-SA 4.0
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      err.email = "Email is invalid";
    }
    if (password.trim().length < 8) {
      err.password = "Password must be at least 8 characters long";
    }
    if (!phone.trim()) {
      err.phone = "Phone is required";
    }
    if (!address.trim()) {
      err.address = "Address is required";
    }
    if (!DOB.trim()) {
      err.DOB = "Date of Birth is required";
    } else {
      const selectedDOB = new Date(DOB);
      const today = new Date();
      if (selectedDOB > today) {
        err.DOB = "Date of Birth cannot be in the future";
      }
    }
    if (!answer.trim()) {
      err.answer = "Answer is required";
    }
    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    setErrors({});

    try {
      const res = await axios.post("/api/v1/auth/register", {
        name,
        email,
        password,
        phone,
        address,
        DOB,
        answer,
      });
      if (res && res.data.success) {
        toast.success("Register Successfully, please login");
        navigate("/login");
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <Layout title="Register - Ecommerce App">
      <div className="form-container" style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit}>
          <h4 className="title">REGISTER FORM</h4>
          <div className="mb-3">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors({ ...errors, name: "" });
              }}
              className="form-control"
              id="exampleInputName1"
              placeholder="Enter Your Name"
              required
              autoFocus
            />
            {errors.name && <p className="text-danger">{errors.name}</p>}
          </div>
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({ ...errors, email: "" });
              }}
              className="form-control"
              id="exampleInputEmail1"
              placeholder="Enter Your Email"
              required
            />
            {errors.email && <p className="text-danger">{errors.email}</p>}
          </div>
          <div className="mb-3">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({ ...errors, password: "" });
              }}
              className="form-control"
              id="exampleInputPassword1"
              placeholder="Enter Your Password"
              required
            />
            {errors.password && (
              <p className="text-danger">{errors.password}</p>
            )}
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors({ ...errors, phone: "" });
              }}
              className="form-control"
              id="exampleInputPhone1"
              placeholder="Enter Your Phone"
              required
            />
            {errors.phone && <p className="text-danger">{errors.phone}</p>}
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setErrors({ ...errors, address: "" });
              }}
              className="form-control"
              id="exampleInputaddress1"
              placeholder="Enter Your Address"
              required
            />
            {errors.address && <p className="text-danger">{errors.address}</p>}
          </div>
          <div className="mb-3">
            <input
              type="Date"
              value={DOB}
              onChange={(e) => {
                setDOB(e.target.value);
                setErrors({ ...errors, DOB: "" });
              }}
              className="form-control"
              id="exampleInputDOB1"
              placeholder="Enter Your DOB"
              required
            />
            {errors.DOB && <p className="text-danger">{errors.DOB}</p>}
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                setErrors({ ...errors, answer: "" });
              }}
              className="form-control"
              id="exampleInputanswer1"
              placeholder="What Is Your Favorite Sport"
              required
            />
            {errors.answer && <p className="text-danger">{errors.answer}</p>}
          </div>
          <button type="submit" className="btn btn-primary">
            REGISTER
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Register;
