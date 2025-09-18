import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Review from './pages/Review';
import Payment from './pages/Payment';
import ToastContainer from './components/ToastContainer';
import Footer from './components/Footer';
import './styles/App.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const showFooter = location.pathname !== '/';
  return (
    <>
      {children}
      {showFooter && <Footer />}
    </>
  );
};

const App = () => {
  return (
    <Router basename='/client'>
      <ToastContainer />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/review" element={<Review />} />
          <Route path="/payment" element={<Payment />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;