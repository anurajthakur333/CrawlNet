import { Elevation, H1, H2, H3, H4, H5, Classes, Button, Intent, Tag, Icon, Divider } from "@blueprintjs/core";
import { useEffect, useState, useRef } from "react";

const FEATURES = [
  {
    icon: "🚀",
    title: "Lightning Performance",
    desc: "Process 1000+ pages per minute with our optimized engine",
    stats: "10x Faster",
    gradient: "linear-gradient(135deg, #FA8BFF 0%, #2BD2FF 52%, #2BFF88 90%)"
  },
  {
    icon: "🛡️",
    title: "Undetectable Scraping",
    desc: "Advanced AI bypasses even the toughest anti-bot systems",
    stats: "99.9% Success",
    gradient: "linear-gradient(135deg, #FFD26F 0%, #3677FF 50%, #C822FF 100%)"
  },
  {
    icon: "🔄",
    title: "Intelligent Rotation",
    desc: "Automatic proxy and user-agent rotation for anonymity",
    stats: "100K+ Proxies",
    gradient: "linear-gradient(135deg, #F761A1 0%, #8C1BAB 100%)"
  },
  {
    icon: "📊",
    title: "Universal Export",
    desc: "Export to CSV, JSON, Excel, SQL, and 20+ formats",
    stats: "All Formats",
    gradient: "linear-gradient(135deg, #43CBFF 0%, #9708CC 100%)"
  },
  {
    icon: "🤖",
    title: "AI-Powered Extraction",
    desc: "Smart content detection and parsing with ML models",
    stats: "95% Accuracy",
    gradient: "linear-gradient(135deg, #F97794 0%, #623AA2 100%)"
  },
  {
    icon: "🔐",
    title: "Enterprise Security",
    desc: "Bank-grade encryption and secure data handling with compliance",
    stats: "SOC2 Certified",
    gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
  }
];

const TESTIMONIALS = [
  { name: "Sarah Chen", role: "Senior Data Scientist", text: "CrawlNet has revolutionized our data collection process. It saves us countless hours every week!", avatar: "🧑‍🔬" },
  { name: "Mike Johnson", role: "CEO, TechCorp", text: "Best web-scraping tool we've ever used. Incredible support and unmatched speed.", avatar: "👨‍💼" },
  { name: "Emma Davis", role: "Marketing Manager", text: "Incredible reliability and ease of use. Our campaigns are powered by CrawlNet data.", avatar: "👩‍💻" }
];

const LandingPage = () => {
  const [scrollY, setScrollY] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking.current = false;
        });
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{
      backgroundColor: "#0a0e27",
      minHeight: "100vh",
      overflow: "hidden",
      width: "100%",
      margin: 0,
      padding: 0
    }}>
      {/* Add CSS animations */}
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: #0a0e27;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.4); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        
        @keyframes wave {
          0% { transform: translateX(0) translateZ(0) scaleY(1); }
          50% { transform: translateX(-25%) translateZ(0) scaleY(0.5); }
          100% { transform: translateX(-50%) translateZ(0) scaleY(1); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }

        .floating { animation: float 6s ease-in-out infinite; }
        .pulsing { animation: pulse 3s ease-in-out infinite; }
        .rotating { animation: rotate 20s linear infinite; }
        .gradient-bg { 
          background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
          background-size: 400% 400%;
          animation: gradient 15s ease infinite;
        }
        .bouncing { animation: bounce 2s ease-in-out infinite; }
        .glowing { animation: glow 2s ease-in-out infinite; }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
        
        .wave {
          animation: wave 15s linear infinite;
        }
        
        .sparkle {
          animation: sparkle 3s ease-in-out infinite;
        }
        
        @media (max-width: 768px) {
          .hero-title {
            font-size: 3rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .hero-title {
            font-size: 2.5rem !important;
          }
        }

        html {
          scroll-behavior: smooth;
        }
        
        .floating, .wave, .rotating, .pulsing {
          will-change: transform;
        }
        
        .glass-card {
          will-change: transform, box-shadow;
        }
      `}</style>

      {/* Hero Section */}
      <section style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: "radial-gradient(ellipse at center, #1a237e 0%, #0a0e27 100%)",
        padding: "80px 20px 20px 20px"
      }}>
        {/* Animated particles background */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden"
        }}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="sparkle"
              style={{
                position: "absolute",
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: "4px",
                height: "4px",
                backgroundColor: "#fff",
                borderRadius: "50%",
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
        
        {/* Animated background elements */}
        <div style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          fontSize: "4rem",
          opacity: 0.1,
          transform: `translateY(${scrollY * 0.5}px)`
        }} className="rotating">
          🌐
        </div>
        <div style={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          fontSize: "3rem",
          opacity: 0.1,
          transform: `translateY(${scrollY * -0.3}px)`
        }} className="floating">
          🚀
        </div>

        <div style={{ textAlign: "center", zIndex: 1, maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          <div className="pulsing glass-card" style={{ 
            background: "linear-gradient(135deg, rgba(0, 208, 255, 0.8) 0%, rgba(130, 4, 255, 0.8) 100%)", 
            borderRadius: "50%", 
            width: "120px", 
            height: "120px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            margin: "0 auto 2rem auto",
            boxShadow: "0 20px 40px rgba(102, 126, 234, 0.6)"
          }}>
            <span style={{ fontSize: "4rem" }}>🌐</span>
          </div>

          <H1 className="gradient-bg hero-title" style={{ 
            fontSize: "5rem",
            fontWeight: "900",
            letterSpacing: "-2px",
            marginBottom: "1rem",
            color: "transparent",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            textShadow: "0 10px 30px rgba(0,0,0,0.3)",
            lineHeight: "1.2"
          }}>
            CrawlNet
          </H1>

          <H3 style={{
            color: "#e0e0e0",
            fontWeight: "300",
            marginBottom: "3rem",
            fontSize: "clamp(1rem, 2.5vw, 1.8rem)",
            padding: "0 20px"
          }}>
          The Future of Web Scraping is Here ⚡
          </H3>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Button 
              className="glowing"
              intent={Intent.PRIMARY} 
              large
              style={{
                fontSize: "clamp(1rem, 2vw, 1.3rem)",
                fontWeight: "700",
                padding: "16px 40px",
                borderRadius: "50px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                transform: "scale(1)",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              🎯 Start Free Trial
            </Button>
            
            <Button 
              large
              outlined
              style={{
                fontSize: "clamp(1rem, 2vw, 1.3rem)",
                fontWeight: "500",
                padding: "16px 40px",
                borderRadius: "50px",
                color: "white",
                borderColor: "white"
              }}
            >
              📺 Watch Demo
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="bouncing" style={{
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "white",
            opacity: 0.6
          }}>
            <Icon icon="chevron-down" size={30} />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{
        padding: "5rem 20px",
        background: "radial-gradient(rgb(13, 16, 55) 0%, rgb(6, 9, 32) 100%)",
        position: "relative"
      }}>
        {/* Glass overlay */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(255, 255, 255, 0.02)",
          backdropFilter: "blur(10px)"
        }} />
        
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "2rem",
          position: "relative",
          zIndex: 1
        }}>
          {[
            { number: "50K+", label: "Users", emoji: "🎉", color: "#FF6B6B" },
            { number: "10M+", label: "Pages Scraped", emoji: "📄", color: "#4ECDC4" },
            { number: "99.9%", label: "Uptime", emoji: "⚡", color: "#FFE66D" },
            { number: "24/7", label: "Support", emoji: "🛟", color: "#95E1D3" }
          ].map((stat, index) => (
            <div key={index} className="floating glass-card" style={{
              padding: "2rem",
              textAlign: "center",
              borderRadius: "20px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              animationDelay: `${index * 0.2}s`,
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{stat.emoji}</div>
              <H2 style={{ 
                color: stat.color, 
                fontSize: "3rem", 
                fontWeight: "800",
                marginBottom: "0.5rem",
                textShadow: "0 4px 20px rgba(0,0,0,0.3)"
              }}>
                {stat.number}
              </H2>
              <p style={{ color: "white", fontSize: "1.2rem", margin: 0 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: "5rem 20px",
        background: "#0a0e27",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Animated mesh gradient background */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
          opacity: 0.6
        }} />
        
        {/* Floating mesh pattern */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
          transform: `translateY(${scrollY * 0.2}px)`
        }} />
        
        {/* Gradient orbs */}
        <div className="floating" style={{
          position: "absolute",
          top: "20%",
          left: "-10%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(250, 139, 255, 0.3) 0%, transparent 70%)",
          filter: "blur(60px)",
          animationDuration: "15s"
        }} />
        <div className="floating" style={{
          position: "absolute",
          bottom: "20%",
          right: "-10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(43, 210, 255, 0.3) 0%, transparent 70%)",
          filter: "blur(80px)",
          animationDuration: "20s",
          animationDelay: "5s"
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <H2 style={{
            textAlign: "center",
            color: "white",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: "800",
            marginBottom: "1rem",
            textShadow: "0 4px 20px rgba(0,0,0,0.5)"
          }}>
            ✨ Supercharged Features ✨
          </H2>
          
          <p style={{
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "1.2rem",
            marginBottom: "4rem",
            maxWidth: "600px",
            margin: "0 auto 4rem auto"
          }}>
            Everything you need to scrape the web at scale with confidence
          </p>

          <div style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "2rem"
          }}>
            {FEATURES.map((feature, index) => (
              <div 
                key={index} 
                className="floating"
                style={{
                  position: "relative",
                  animationDelay: `${index * 0.1}s`,
                  animationDuration: "8s"
                }}
              >
                <div 
                  className="glass-card"
                  style={{
                    padding: "2.5rem",
                    borderRadius: "30px",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                    transform: "translateY(0)",
                    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(255, 255, 255, 0.03)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-10px) scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 30px 80px rgba(0, 0, 0, 0.5)";
                    e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow = "0 10px 40px rgba(0, 0, 0, 0.3)";
                    e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.1)";
                  }}
                >
                  {/* Background gradient effect */}
                  <div style={{
                    position: "absolute",
                    top: "-50%",
                    left: "-50%",
                    width: "200%",
                    height: "200%",
                    background: feature.gradient,
                    opacity: 0.1,
                    transform: "rotate(45deg)",
                    transition: "opacity 0.3s ease"
                  }} />
                  
                  {/* Icon container */}
                  <div style={{
                    width: "80px",
                    height: "80px",
                    background: feature.gradient,
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1.5rem",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                    position: "relative"
                  }}>
                    <span style={{ fontSize: "2.5rem", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
                      {feature.icon}
                    </span>
                  </div>
                  
                  <H3 style={{ 
                    color: "white", 
                    marginBottom: "0.5rem", 
                    fontSize: "1.5rem",
                    fontWeight: "700"
                  }}>
                    {feature.title}
                  </H3>
                  
                  <p style={{ 
                    color: "rgba(255,255,255,0.7)", 
                    fontSize: "1rem", 
                    marginBottom: "1.5rem",
                    lineHeight: "1.6"
                  }}>
                    {feature.desc}
                  </p>
                  
                  {/* Stats badge */}
                  <div style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    background: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "20px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "white",
                    fontSize: "0.9rem",
                    fontWeight: "600"
                  }}>
                    {feature.stats}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Pricing Section with New Background */}
      <section style={{
        padding: "5rem 20px",
        position: "relative",
        overflow: "hidden",
        background: "#0a0e27"
      }}>
        {/* Animated gradient mesh background */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 40% 20%, rgba(255, 206, 84, 0.2) 0%, transparent 50%)",
          filter: "blur(40px)",
          transform: `translateY(${scrollY * 0.1}px)`
        }} />
        
        {/* Animated grid pattern */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
          transform: `translateX(${scrollY * 0.1}px)`
        }} />
        
        {/* Floating elements */}
        <div className="floating" style={{
          position: "absolute",
          top: "10%",
          right: "10%",
          fontSize: "8rem",
          opacity: 0.05,
          transform: "rotate(15deg)",
          animationDuration: "20s"
        }}>
          💎
        </div>
        <div className="floating" style={{
          position: "absolute",
          bottom: "10%",
          left: "5%",
          fontSize: "6rem",
          opacity: 0.05,
          transform: "rotate(-15deg)",
          animationDuration: "25s",
          animationDelay: "5s"
        }}>
          ⭐
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center"}}>
            
            <H2 style={{
              color: "white",
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontWeight: "800",
              marginBottom: "1rem",
              textShadow: "0 4px 30px rgba(0,0,0,0.5)",
              letterSpacing: "-1px"
            }}>
              Choose Your Perfect Plan
            </H2>
            
            <p style={{
              color: "#9ca3af",
              fontSize: "1.3rem",
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>

          <div style={{
            maxWidth: "1300px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "2rem",
            perspective: "1000px"
          }}>
            {[
              { 
                name: "Starter", 
                price: "$29", 
                emoji: "🌱",
                description: "Perfect for small projects",
                features: [
                  { text: "1,000 pages/day", included: true },
                  { text: "Basic support", included: true },
                  { text: "CSV export", included: true },
                  { text: "5 concurrent requests", included: true },
                  { text: "API access", included: false },
                  { text: "Priority queue", included: false }
                ],
                color: "#4ECDC4",
                gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              },
              { 
                name: "Pro", 
                price: "$99", 
                emoji: "🚀",
                description: "Most popular for growing teams",
                features: [
                  { text: "50,000 pages/day", included: true },
                  { text: "Priority support", included: true },
                  { text: "All export formats", included: true },
                  { text: "50 concurrent requests", included: true },
                  { text: "Full API access", included: true },
                  { text: "Priority queue", included: true }
                ],
                color: "#FFE66D",
                gradient: "linear-gradient(135deg, #FFE66D 0%, #FFA502 100%)",
                popular: true
              },
              { 
                name: "Enterprise", 
                price: "Custom", 
                emoji: "🏢",
                description: "Tailored for large organizations",
                features: [
                  { text: "Unlimited pages", included: true },
                  { text: "Dedicated support", included: true },
                  { text: "Custom integrations", included: true },
                  { text: "Unlimited requests", included: true },
                  { text: "SLA guarantee", included: true },
                  { text: "On-premise option", included: true }
                ],
                color: "#FF6B6B",
                gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
              }
            ].map((plan, index) => (
              <div 
                key={index} 
                style={{ 
                  marginTop: "70px",
                  position: "relative",
                  transform: plan.popular ? "scale(1.05)" : "scale(1)",
                  zIndex: plan.popular ? 2 : 1
                }}
              >
     
                
                <div 
                  className={`${plan.popular ? 'floating' : ''}`}
                  style={{
                    padding: "3.5rem 2.5rem",
                    borderRadius: "24px",
                    position: "relative",
                    overflow: "hidden",
                    background: plan.popular 
                      ? "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)"
                      : "rgba(255, 255, 255, 0.03)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: plan.popular 
                      ? "2px solid rgba(255, 215, 0, 0.3)" 
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: plan.popular
                      ? "0 20px 60px rgba(255, 215, 0, 0.2)"
                      : "0 10px 40px rgba(0, 0, 0, 0.2)",
                    transform: "translateY(0)",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    animationDuration: plan.popular ? "6s" : "none",
                    animationDelay: `${index * 0.2}s`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-10px)";
                    e.currentTarget.style.boxShadow = plan.popular
                      ? "0 30px 80px rgba(255, 215, 0, 0.3)"
                      : "0 20px 60px rgba(0, 0, 0, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = plan.popular
                      ? "0 20px 60px rgba(255, 215, 0, 0.2)"
                      : "0 10px 40px rgba(0, 0, 0, 0.2)";
                  }}
                >
                  {/* Gradient accent */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "4px",
                    background: plan.gradient
                  }} />
                  
                  <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div className="floating" style={{ 
                      fontSize: "3.5rem", 
                      marginBottom: "1rem",
                      filter: "drop-shadow(0 5px 15px rgba(0,0,0,0.3))",
                      animationDuration: "4s"
                    }}>
                      {plan.emoji}
                    </div>
                    
                    <H3 style={{ 
                      color: "white", 
                      marginBottom: "0.5rem",
                      fontSize: "1.8rem",
                      fontWeight: "700"
                    }}>
                      {plan.name}
                    </H3>
                    
                    <p style={{
                      color: "#9ca3af",
                      fontSize: "1rem",
                      marginBottom: "1.5rem"
                    }}>
                      {plan.description}
                    </p>
                    
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.5rem" }}>
                      <H2 style={{ 
                        fontSize: "3.5rem", 
                        fontWeight: "900", 
                        margin: 0,
                        color: "white",
                        textShadow: "0 3px 10px rgba(0,0,0,0.3)"
                      }}>
                        {plan.price}
                      </H2>
                      {plan.price !== "Custom" && (
                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.2rem" }}>/month</span>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: "2rem" }}>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} style={{
                        padding: "0.75rem 0",
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        color: feature.included ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                        fontSize: "1rem"
                      }}>
                        <span style={{ 
                          fontSize: "1.2rem",
                          filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.3))"
                        }}>
                          {feature.included ? "✅" : "❌"}
                        </span> 
                        <span style={{ textDecoration: feature.included ? "none" : "line-through" }}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    fill
                    large
                    style={{
                      borderRadius: "12px",
                      fontWeight: "700",
                      fontSize: "1.1rem",
                      padding: "1rem",
                      background: plan.popular ? plan.gradient : "transparent",
                      border: plan.popular ? "none" : "2px solid rgba(255,255,255,0.2)",
                      color: "white",
                      boxShadow: plan.popular ? "0 5px 20px rgba(0,0,0,0.3)" : "none",
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.02)";
                      e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = plan.popular ? "0 5px 20px rgba(0,0,0,0.3)" : "none";
                    }}
                  >
                    {plan.price === "Custom" ? (
                      <>Contact Sales 📞</>
                    ) : (
                      <>Get Started →</>
                    )}
                  </Button>
                  
                  {plan.popular && (
                    <p style={{
                      textAlign: "center",
                      marginTop: "1rem",
                      color: "#9ca3af",
                      fontSize: "0.9rem"
                    }}>
                      🔥 Chosen by 80% of our customers
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div style={{
            textAlign: "center",
            marginTop: "4rem",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "2rem",
            flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#9ca3af" }}>
              <span style={{ fontSize: "1.5rem" }}>🔒</span>
              <span>SSL Secured</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#9ca3af" }}>
              <span style={{ fontSize: "1.5rem" }}>💳</span>
              <span>No Credit Card Required</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#9ca3af" }}>
              <span style={{ fontSize: "1.5rem" }}>↩️</span>
              <span>30-Day Money Back</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{
        padding: "6rem 20px",
        position: "relative",
        overflow: "hidden",
        background: "#111827"
      }}>
        {/* Background radial gradients */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.25) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgba(236,72,153,0.2) 0%, transparent 60%)",
          filter: "blur(80px)"
        }} />

        {/* Grid overlay */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px"
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <H2 style={{
            textAlign: "center",
            color: "white",
            fontSize: "clamp(2.2rem, 5vw, 3.75rem)",
            fontWeight: "800",
            marginBottom: "1rem",
            textShadow: "0 4px 20px rgba(0,0,0,0.5)"
          }}>
            ❤️ Trusted by Professionals
          </H2>
          <p style={{
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "1.2rem",
            marginBottom: "4rem",
            maxWidth: "700px",
            margin: "0 auto"
          }}>
            Thousands of developers and businesses rely on CrawlNet every day.
          </p>

          <div style={{
            paddingTop: "100px",
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2.5rem"
          }}>
            {TESTIMONIALS.map((user, idx) => (
              <div
                key={idx}
                className="floating"
                style={{
                  padding: "2.5rem 2rem 3rem",
                  borderRadius: "24px",
                  background: "rgba(255, 255, 255, 0.04)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  position: "relative",
                  transform: "translateY(0)",
                  transition: "all 0.35s ease",
                  animationDuration: "10s",
                  animationDelay: `${idx * 0.3}s`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 25px 60px rgba(0,0,0,0.45)";
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.5rem",
                  color: "white",
                  margin: "0 auto 1.5rem"
                }}>
                  {user.avatar}
                </div>

                {/* Quote */}
                <p style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "1.1rem",
                  marginBottom: "1.5rem",
                  lineHeight: "1.6",
                  fontStyle: "italic",
                  position: "relative"
                }}>
                  <span style={{ fontSize: "2rem", verticalAlign: "top", color: "#667eea" }}>&ldquo;</span>
                  {user.text}
                  <span style={{ fontSize: "2rem", verticalAlign: "bottom", color: "#667eea" }}>&rdquo;</span>
                </p>

                {/* Name & role */}
                <H4 style={{ color: "#ffffff", marginBottom: "0.25rem", fontSize: "1.25rem" }}>{user.name}</H4>
                <p style={{ color: "#9ca3af", marginBottom: "1rem", fontSize: "0.95rem" }}>{user.role}</p>

                {/* Stars */}
                <div style={{ fontSize: "1.3rem", color: "#FBBF24" }}>
                  {"★★★★★"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: "5rem 20px",
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        textAlign: "center"
      }}>
        <div className="pulsing" style={{ 
          fontSize: "5rem", 
          marginBottom: "2rem",
          filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))"
        }}>
          🎯
        </div>
        
        <H2 style={{
          color: "white",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: "800",
          marginBottom: "1.5rem",
          textShadow: "0 4px 20px rgba(0,0,0,0.5)"
        }}>
          Ready to Scrape the Web?
        </H2>

        <h3 style={{
          color: "white",
          fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
          marginBottom: "3rem",
          maxWidth: "600px",
          margin: "0 auto 3rem auto",
          textShadow: "0 4px 20px rgba(0,0,0,0.5)"
        }}>
        🌐 CrawlNet – Fast and scalable web scraper using FastAPI + Selenium.
        </h3>


      </section>

      {/* Footer */}
      <footer style={{
        padding: "3rem 20px",
        background: "#0a0e27",
        borderTop: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{ textAlign: "center", maxWidth: "1200px", margin: "0 auto" }}>
          <div className="floating" style={{ marginBottom: "2rem" }}>
            <a 
              href="https://anuraj.online" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <H4 style={{ 
                color: "#9ca3af", 
                fontWeight: "400",
                margin: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem"
              }}>
              {" "}
                <span style={{ 
                  fontFamily: "Lucida Console",
                  color: "white", 
                  fontWeight: "700",
                  fontSize: "1.3rem",
                  borderRadius: "7px",
                  background: "linear-gradient(135deg, #6a0572 0%, #ab1a6c 100%)",
                  padding: "0.5rem 1rem",
                  boxShadow: "0 10px 40px rgba(46, 46, 46, 0.6)"
                }}>
                  Anuraj.online
                </span>
              </H4>
            </a>
          </div>

          <div style={{
            display: "flex",
            gap: "2rem",
            justifyContent: "center",
            flexWrap: "wrap",
            color: "#9ca3af"
          }}>
            <a href="" style={{ color: "inherit", textDecoration: "none" }}>📖 Documentation</a>
            <a href="" style={{ color: "inherit", textDecoration: "none" }}>🛟 Support</a>
            <a href="" style={{ color: "inherit", textDecoration: "none" }}>🔒 Privacy</a>
            <a href="" style={{ color: "inherit", textDecoration: "none" }}>📜 Terms</a>
          </div>

          <p style={{
            color: "#6b7280",
            marginTop: "2rem",
            fontSize: "0.9rem"
          }}>
            © 2024 CrawlNet. All rights reserved. 🌐
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;