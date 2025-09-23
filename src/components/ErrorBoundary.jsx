// src/components/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error){
    return { hasError: true, error };
  }
  componentDidCatch(error, info){
    // אפשר לחבר ל-logging חיצוני כאן
    this.setState({ info });
    console.error("[ErrorBoundary]", error, info);
  }
  render(){
    if(this.state.hasError){
      return (
        <div className="page" dir="rtl">
          <div className="card" style={{borderColor:"#ff5c7a"}}>
            <div className="card-title">ארעה שגיאה בזמן טעינה</div>
            <p className="muted">האפליקציה הציגה שגיאה במקום “מסך שחור”.</p>
            <pre style={{whiteSpace:"pre-wrap", direction:"ltr"}}>
{String(this.state.error || "")}
            </pre>
            {this.state.info?.componentStack && (
              <details style={{marginTop:8}}>
                <summary>Stack</summary>
                <pre style={{whiteSpace:"pre-wrap", direction:"ltr"}}>
{this.state.info.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
