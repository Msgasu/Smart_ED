import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const PerformanceChart = ({ assignments, title }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!assignments || assignments.length === 0) {
      console.log("No assignments to display in chart");
      return;
    }
    
    console.log("Rendering chart with assignments:", assignments);
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Prepare data for the chart
    const labels = assignments.map(a => {
      return a.title || a.assignments?.title || 'Unnamed Assignment';
    });
    
    const scores = assignments.map(a => {
      // Handle different data structures (student view vs teacher view)
      if (a.student_assignments && a.student_assignments[0]?.score) {
        return (a.student_assignments[0].score / a.max_score) * 100;
      } else if (a.score !== undefined && a.assignments?.max_score) {
        return (a.score / a.assignments.max_score) * 100;
      }
      return 0;
    });
    
    // Create the chart
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Score (%)',
            data: scores,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title || 'Performance Over Time'
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Score (%)'
            }
          }
        }
      }
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [assignments, title]);

  return (
    <div>
      <h3>{title || 'Performance Chart'}</h3>
      <div style={{ height: '300px', width: '100%' }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default PerformanceChart; 