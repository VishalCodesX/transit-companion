// Index simply forwards to the login route. The router decides where to send
// users based on their role.
import { Navigate } from "react-router-dom";

const Index = () => <Navigate to="/login" replace />;

export default Index;
