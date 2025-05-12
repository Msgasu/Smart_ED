import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { format } from 'date-fns';

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
    // Sort assignments by due date if available
    const sortedAssignments = [...assignments].sort((a, b) => {
      const dateA = new Date(a.due_date || a.created_at || 0);
      const dateB = new Date(b.due_date || b.created_at || 0);
      return dateA - dateB;
    });
    
    const labels = sortedAssignments.map(a => {
      // Use shorter assignment names for better readability
      const assignmentTitle = a.title || a.assignments?.title || 'Assignment';
      return assignmentTitle.length > 15 ? assignmentTitle.substring(0, 15) + '...' : assignmentTitle;
    });
    
    const dates = sortedAssignments.map(a => {
      const date = new Date(a.due_date || a.created_at || new Date());
      return format(date, 'MMM d');
    });
    
    const scores = sortedAssignments.map(a => {
      // Handle different data structures (student view vs teacher view)
      if (a.student_assignments && a.student_assignments[0]?.score) {
        return (a.student_assignments[0].score / a.max_score) * 100;
      } else if (a.score !== undefined && a.assignments?.max_score) {
        return (a.score / a.assignments.max_score) * 100;
      }
      return 0;
    });
    
    // Calculate average score for reference line
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Define gradient for the chart
    const ctx = chartRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(52, 152, 219, 0.6)');  // Blue with opacity
    gradient.addColorStop(1, 'rgba(52, 152, 219, 0.0)');  // Transparent
    
    // Create the chart
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Score (%)',
            data: scores,
            borderColor: '#3498db',
            borderWidth: 3,
            pointBackgroundColor: '#2980b9',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.3,
            fill: true,
            backgroundColor: gradient
          },
          {
            label: 'Average',
            data: Array(labels.length).fill(avgScore),
            borderColor: 'rgba(46, 204, 113, 0.7)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 15,
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          title: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#333',
            bodyColor: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              title: (tooltipItems) => {
                return labels[tooltipItems[0].dataIndex];
              },
              label: (context) => {
                if (context.datasetIndex === 0) {
                  return `Score: ${context.raw.toFixed(1)}%`;
                } else {
                  return `Average: ${context.raw.toFixed(1)}%`;
                }
              },
              afterLabel: (context) => {
                if (context.datasetIndex === 0) {
                  return `Date: ${dates[context.dataIndex]}`;
                }
                return '';
              }
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
              borderDash: [3, 3]
            },
            ticks: {
              font: {
                size: 11
              },
              callback: (value) => `${value}%`
            },
            title: {
              display: true,
              text: 'Score (%)',
              font: {
                size: 13,
                weight: 'bold'
              },
              padding: {
                top: 10,
                bottom: 10
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 11
              },
              maxRotation: 45,
              minRotation: 45
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
    <div className="performance-chart">
      <h3 className="chart-title">{title || 'Performance Chart'}</h3>
      <div className="chart-container">
        <canvas ref={chartRef}></canvas>
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#3498db' }}></span>
          <span className="legend-text">Your scores</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#2ecc71', borderStyle: 'dashed' }}></span>
          <span className="legend-text">Class average</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart; 