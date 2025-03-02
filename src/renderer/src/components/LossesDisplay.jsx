import { useEffect, useState } from 'react';
import './LossesDisplay.css';

function LossesDisplay() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [language, setLanguage] = useState('');

  const fetchData = (date) => {
    window.electron.ipcRenderer.invoke('get-data', date, language)
      .then(response => {
        if (response.error) {
          setError(response.error);
        } else {
          setData(response);
        }
      })
      .catch(err => {
        console.error('Помилка отримання даних:', err);
        setError(err.message);
      });
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, language]); 

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); 
    
    if (newDate <= today) {
      setSelectedDate(newDate.toISOString().split('T')[0]);
    }
  };

  const handleDateChange = (e) => {
    const selectedValue = e.target.value;
    const selectedDateObj = new Date(selectedValue);
    const today = new Date();
    today.setHours(23, 59, 59, 999); 
    
    if (selectedDateObj <= today) {
      setSelectedDate(selectedValue);
    }
  };

  const setLang = (lang) => {
    setLanguage(lang);
  };

  const maxDate = new Date().toISOString().split('T')[0];
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = new Intl.DateTimeFormat(language === '' ? 'uk-UA' : 'en-US', { month: 'long' }).format(date);
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleDateDisplayClick = () => {
    document.querySelector('.hidden-date-input').showPicker();
  };

  if (error) return <div className="error-container">{language === '' ? 'Помилка:' : 'Error:'} {error}</div>;
  if (!data) return <div className="loading-container">{language === '' ? 'Завантаження даних...' : 'Loading data...'}</div>;

  return (
    <div className="losses-container">
      <header className="losses-header">
        <div className="top-bar">
          <h1 className="losses-title">{data.title}</h1>
        </div>
        
        <div className="date-navigator">
          {language === '' ? 'Станом на:' : 'As for:'}
          
          <button className="arrow-btn" onClick={() => changeDate(-1)}>
            <span>&#10094;</span>
          </button>
          
          <div className="date-display" onClick={handleDateDisplayClick}>
            {formatDate(selectedDate)}
          </div>
          
          <button className="arrow-btn" onClick={() => changeDate(1)}>
            <span>&#10095;</span>
          </button>
          
          <div className="war-day-info">
            {data.facebookLink && (
              <p className="war-day-number">
                <a href={data.facebookLink} target="_blank" rel="noopener noreferrer">
                {data.dayOfWar}-{language === '' ? 'й день війни' : 'th day of war'}
                </a>
              </p>
            )}
          </div>
          <button 
              className={`language-option ${language === '' ? 'active' : ''}`} 
              onClick={() => setLang('')}>
              UA
            </button>
            <span className="language-divider">|</span>
            <button 
              className={`language-option ${language === 'en' ? 'active' : ''}`} 
              onClick={() => setLang('en')}>
              EN
            </button>
        </div>
        
        <input 
          type="date" 
          value={selectedDate} 
          onChange={handleDateChange}
          max={maxDate}
          className="hidden-date-input"
        />
      </header>
      
      <div className="losses-grid">
        {data.losses.map((item, index) => (
          <div key={index} className="loss-card">
            <div className="loss-icon">
              {data.icons[item.iconId] ? (
                <span
                  className="icon"
                  dangerouslySetInnerHTML={{ __html: data.icons[item.iconId] }}
                />
              ) : (
                <span className="icon-fallback">📊</span>
              )}
            </div>
            <div className="loss-details">
              <h3 className="loss-total">{item.total}</h3>
              {item.change && <span className="loss-change">{item.change}</span>}
              <p className="loss-category">{item.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LossesDisplay;