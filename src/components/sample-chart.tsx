import React, { useEffect, useState } from 'react';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement } from "chart.js";
import { Line } from 'react-chartjs-2';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement)

const data = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'My First dataset',
      data: [65, 59, 80, 81, 56, 55, 40]
    }
  ]
};

type SalesForecast = Record<string, {
  forecastedSalesQty: number,
  date: string,
}[]>;
type WheatherForecast = { date: string, temperature: number };
type Alert = Record<string, string[]>;

const host = 'http://localhost:3001'; // Just for now, should be in env var later on

async function getSalesForecast(fromDate: string, toDate: string): Promise<SalesForecast | null> {
  const response = await fetch(`${host}/salesforecast?fromDate=${fromDate}&toDate=${toDate}`);

  if (response.ok) {
    return await response.json();
  }

  return null;
}

async function getWheatherForecast(fromDate: string, toDate: string, city: string): Promise<WheatherForecast[]> {
  const response = await fetch(`${host}/wheatherforecast?fromDate=${fromDate}&toDate=${toDate}&city=${city}`);
  
  if (response.ok) {
    return await response.json();
  }

  return [];
}

async function getAlerts(fromDate: string, toDate: string): Promise<Alert | null> {
  const response = await fetch(`${host}/alerts?fromDate=${fromDate}&toDate=${toDate}`);
  
  if (response.ok) {
    return await response.json();
  }

  return null;
}

function dateString(date: Date) { 
  return date.toISOString().split('T')[0];
}

function getSalesForecastGraphData(salesForecast: SalesForecast, city: string) {
  const sortedSaleFc = salesForecast[city].sort((a, b) => (a.date > b.date ? 1 : -1))

  return {
    labels: sortedSaleFc.map(saleFc => saleFc.date),
    datasets: [
      {
        data: sortedSaleFc.map(saleFc => saleFc.forecastedSalesQty)
      }
    ]
  }
}

function getWheatherForecastGraphData(wheatherForecast: WheatherForecast[]) {
  const sortedWheatherFc = wheatherForecast.sort((a, b) => (a.date > b.date ? 1 : -1))

  return {
    labels: sortedWheatherFc.map(wheatherFc => wheatherFc.date),
    datasets: [
      {
        data: sortedWheatherFc.map(wheatherFc => wheatherFc.temperature)
        
      }
    ],
    options: {scales: {y: { title: { display: true, text: 'seconds' }}}}
  }
}

export default function SampleChart() {
  const [cities, setCities] = useState<string[]>([]);
  const [salesForecast, setSalesForecast] = useState<SalesForecast>();
  const [wheatherForecast, setWheatherForecast] = useState<Record<string, WheatherForecast[]>>({});
  const [saleGraphData, setSaleGraphData] = useState<any>();
  const [wheatherForecastGraphData, setWheatherForecastGraphData] = useState<any>();
  const [suggestions, setSuggestions] = useState<Alert>();
  const today = new Date();
  const next2Weeks = new Date();
  next2Weeks.setDate(next2Weeks.getDate() + 14);

  useEffect(() => {
    getSalesForecast(dateString(today), dateString(next2Weeks)).then(saleFc => {
      if (saleFc === null) {
        alert('No sales forecast available');
        return;
      }
      setSalesForecast(saleFc);
      setCities(Object.keys(saleFc));
    });

    getAlerts(dateString(today), dateString(next2Weeks)).then((a: Alert | null) => {
      if (a) {
        setSuggestions(a);
      }
    });
  }, [])

  const handleCityChange = (event: any) => {
    const city = event.target.value;

    if (city === 'none') {
      setSaleGraphData(undefined);
      setWheatherForecastGraphData(undefined);
      return;
    }

    if (salesForecast && salesForecast[city]) {
      setSaleGraphData(getSalesForecastGraphData(salesForecast, city));
    } else {
      setSaleGraphData(undefined)
    }

    if (!wheatherForecast[city]) {
      getWheatherForecast(dateString(today), dateString(next2Weeks), city).then(wheatherForecastResult => {
        setWheatherForecast((prevState) => ({
          ...prevState,
          [city]: wheatherForecastResult
        }));
        setWheatherForecastGraphData(getWheatherForecastGraphData(wheatherForecastResult));
      })
    } else {
      setWheatherForecastGraphData(getWheatherForecastGraphData(wheatherForecast[city]));
    }
  }

  const getClosedDays = () => {
    if (!suggestions) {
      return;
    }
    let suggestionString = 'Suggest to close store\n\n';
    Object.keys(suggestions).map(city => suggestionString += `${city}: ${suggestions[city].toString()}\n\n`);
    alert(suggestionString);
  }

  return (
    <div>
      {
        suggestions ? <button className="bg-cyan-500 hover:bg-cyan-600 p-2" onClick={getClosedDays}>Get alerts</button> : null
      }      
      {
        cities.length > 0 ? 
          <div>
            <h2>Choose a city</h2>
            <select className="border" onChange={handleCityChange}>
              <option value="none">Choose a city</option>
              {cities.map(city => <option value={city}>{city}</option>)}
            </select>
          </div> : null
      }
      {
        saleGraphData ? 
        <div className='p-10'>
          <h1>Forecasted sale quantity</h1>
          <Line
            data={saleGraphData}
            width={800}
            height={400}
          />
        </div> : null
      }
      {
        wheatherForecastGraphData ?
        <div className='p-10'>
          <h1>Forecasted wheather (temperature in Degree Celcius)</h1>
          <Line
            data={wheatherForecastGraphData}
            width={800}
            height={400}
          />
        </div> : null
      }
    </div>
  );
} 