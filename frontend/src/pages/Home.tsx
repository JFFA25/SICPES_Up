import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import { useEffect } from "react";
import "../styles/sicpes-ui.css";

const Home = () => {
  useEffect(() => {
    document.title = "SICPES";
  }, []);

  return (
    <div className="mk-home">
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
};

export default Home;