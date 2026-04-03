import React, { useState } from 'react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [image, setImage] = useState(null);
  const [textResult, setTextResult] = useState('');
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('image'); // 'image' or 'text'

  const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;

  const queryImage = async (data) => {
    if (!HF_TOKEN) throw new Error("Hugging Face API token is missing.");

    const response = await fetch(
      "https://router.huggingface.co/nscale/v1/images/generations",
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const json = await response.json();
      if (json.data && json.data.length > 0) {
        if (json.data[0].b64_json) return `data:image/jpeg;base64,${json.data[0].b64_json}`;
        if (json.data[0].url) return json.data[0].url;
      }
      throw new Error("Unexpected JSON response format.");
    } else {
      const result = await response.blob();
      return URL.createObjectURL(result);
    }
  };

  const queryText = async (promptText) => {
    if (!HF_TOKEN) throw new Error("Hugging Face API token is missing.");

    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ 
          messages: [
            {
              role: "user",
              content: promptText,
            },
          ],
          model: "Qwen/Qwen2.5-1.5B-Instruct:featherless-ai",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    if (json.choices && json.choices.length > 0 && json.choices[0].message) {
      return json.choices[0].message.content.trim();
    }
    throw new Error("Unexpected text generation format.");
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      if (mode === 'image') {
        setImage(null);
        const resultImage = await queryImage({
          response_format: "b64_json",
          prompt: prompt,
          model: "stabilityai/stable-diffusion-xl-base-1.0",
        });
        setImage(resultImage);
      } else {
        setTextResult('');
        const resultingText = await queryText(prompt);
        setTextResult(resultingText);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while generating.');
    } finally {
      setIsGenerating(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    // Optionally clear results when switching modes
    // setImage(null);
    // setTextResult('');
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Forge<span className="highlight">AI</span></h1>
        <p>Transform your words into breathtaking visuals & brilliant text</p>
      </header>
      
      <main className="main-content">
        
        <div className="mode-toggle">
          <button 
            type="button" 
            className={`toggle-btn ${mode === 'image' ? 'active' : ''}`}
            onClick={() => switchMode('image')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Text to Image
          </button>
          <button 
            type="button" 
            className={`toggle-btn ${mode === 'text' ? 'active' : ''}`}
            onClick={() => switchMode('text')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Text to Text
          </button>
        </div>

        <form className="generator-form" onSubmit={handleGenerate}>
          <div className="input-group">
            <input 
              type="text" 
              placeholder={mode === 'image' ? "Describe what you want to see... e.g. 'Cyberpunk city at sunset'" : "Ask me anything... e.g. 'Write a poem about a cyberpunk city'"}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
            <button type="submit" disabled={isGenerating || !prompt.trim()} className="generate-btn">
              {isGenerating ? <div className="loader"></div> : 'Generate'}
            </button>
          </div>
        </form>

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{minWidth: '20px'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <p>{error}</p>
          </div>
        )}

        <div className={`display-section ${mode === 'image' ? 'image-mode' : 'text-mode'}`}>
          {mode === 'image' ? (
            image ? (
              <div className="image-container">
                <img src={image} alt={prompt} className="generated-image" />
                <div className="image-overlay">
                  <p className="prompt-text">"{prompt}"</p>
                </div>
              </div>
            ) : (
              <div className={`placeholder-container ${isGenerating ? 'generating' : ''}`}>
                {isGenerating ? (
                  <>
                    <div className="large-loader"></div>
                    <p>Dreaming up your image...</p>
                  </>
                ) : (
                  <>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="placeholder-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <p>Your creation will appear here</p>
                  </>
                )}
              </div>
            )
          ) : (
            textResult ? (
              <div className="text-result-container">
                 <div className="prompt-header">
                    <strong>You:</strong> {prompt}
                 </div>
                 <div className="text-body">
                    <p>{textResult}</p>
                 </div>
              </div>
            ) : (
              <div className={`placeholder-container ${isGenerating ? 'generating' : ''}`}>
                {isGenerating ? (
                  <>
                    <div className="large-loader"></div>
                    <p>Composing response...</p>
                  </>
                ) : (
                  <>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="placeholder-icon"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    <p>Your text response will appear here</p>
                  </>
                )}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
