import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get("/api/v1/user/all");
        if (data?.success) {
          setUsers(data.users);
        }
      } catch (error) {
        console.log(error);
        toast.error("Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table data-testid="user-list-table" className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

export default UserList;
