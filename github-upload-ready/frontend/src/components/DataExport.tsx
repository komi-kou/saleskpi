import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { API_BASE_URL } from '../config';
import './DataExport.css';

const DataExport: React.FC = () => {
  const [exportType, setExportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const handleExportTypeChange = (type: 'weekly' | 'monthly' | 'custom') => {
    setExportType(type);
    const now = new Date();
    
    if (type === 'weekly') {
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (type === 'monthly') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    }
  };

  const exportToCSV = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/csv?start=${startDate}&end=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        // CSVヘッダー
        const headers = [
          '日付',
          '送信数(手動)',
          '送信数(外注)',
          '有効送信数(手動)',
          '有効送信数(手動・本日)',
          '有効送信数(外注)',
          '返信数',
          '返信率(%)',
          '面談数',
          '面談率(%)',
          '成約数',
          '成約率(%)',
          '案件数',
          '案件化率(%)',
          '継続案件数',
          'スライド視聴数',
          'スライド視聴率(%)',
          '動画視聴数',
          '動画視聴率(%)',
          'メモ'
        ];
        
        // CSVデータ作成
        let csvContent = headers.join(',') + '\n';
        
        data.data.forEach((row: any) => {
          const totalValid = (row.valid_emails_manual || 0) + (row.valid_emails_outsource || 0);
          const replyRate = totalValid > 0 ? ((row.replies_received || 0) / totalValid * 100).toFixed(2) : '0';
          const meetingRate = row.replies_received > 0 ? ((row.meetings_scheduled || 0) / row.replies_received * 100).toFixed(2) : '0';
          const dealRate = row.meetings_scheduled > 0 ? ((row.deals_closed || 0) / row.meetings_scheduled * 100).toFixed(2) : '0';
          const projectRate = row.deals_closed > 0 ? ((row.projects_created || 0) / row.deals_closed * 100).toFixed(2) : '0';
          const slideViewRate = totalValid > 0 ? ((row.slide_views || 0) / totalValid * 100).toFixed(2) : '0';
          const videoViewRate = totalValid > 0 ? ((row.video_views || 0) / totalValid * 100).toFixed(2) : '0';
          
          const rowData = [
            row.date,
            row.emails_sent_manual || 0,
            row.emails_sent_outsource || 0,
            row.valid_emails_manual || 0,
            row.valid_emails_manual_today || 0,
            row.valid_emails_outsource || 0,
            row.replies_received || 0,
            replyRate,
            row.meetings_scheduled || 0,
            meetingRate,
            row.deals_closed || 0,
            dealRate,
            row.projects_created || 0,
            projectRate,
            row.ongoing_projects || 0,
            row.slide_views || 0,
            slideViewRate,
            row.video_views || 0,
            videoViewRate,
            `"${(row.notes || '').replace(/"/g, '""')}"`
          ];
          
          csvContent += rowData.join(',') + '\n';
        });
        
        // 集計行を追加
        const totals = data.totals;
        if (totals) {
          csvContent += '\n合計,';
          csvContent += `${totals.total_emails_manual || 0},`;
          csvContent += `${totals.total_emails_outsource || 0},`;
          csvContent += `${totals.total_valid_emails_manual || 0},`;
          csvContent += `,`; // 本日分は合計しない
          csvContent += `${totals.total_valid_emails_outsource || 0},`;
          csvContent += `${totals.total_replies || 0},`;
          csvContent += `${totals.avg_reply_rate || 0},`;
          csvContent += `${totals.total_meetings || 0},`;
          csvContent += `${totals.avg_meeting_rate || 0},`;
          csvContent += `${totals.total_deals || 0},`;
          csvContent += `${totals.avg_deal_rate || 0},`;
          csvContent += `${totals.total_projects || 0},`;
          csvContent += `${totals.avg_project_rate || 0},`;
          csvContent += `,`; // 継続案件は平均を取る
          csvContent += `${totals.total_slide_views || 0},`;
          csvContent += `${totals.avg_slide_view_rate || 0},`;
          csvContent += `${totals.total_video_views || 0},`;
          csvContent += `${totals.avg_video_view_rate || 0},`;
          csvContent += '\n';
        }
        
        // ダウンロード処理（data: URL方式に変更）
        const url = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvContent);
        const link = document.createElement('a');
        link.href = url;
        link.download = `kpi_export_${startDate}_${endDate}.csv`;
        link.click();
      } else {
        // データが0件の場合の処理
        alert('エクスポートするデータがありません。期間を確認してください。');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const exportToJSON = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/json?start=${startDate}&end=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      // JSONダウンロード処理（data: URL方式に変更）
      const jsonString = JSON.stringify(data, null, 2);
      const url = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kpi_export_${startDate}_${endDate}.json`;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="data-export">
      <h2>データエクスポート</h2>
      
      <div className="export-options">
        <div className="period-selector">
          <h3>期間選択</h3>
          <div className="period-buttons">
            <button 
              className={exportType === 'weekly' ? 'active' : ''}
              onClick={() => handleExportTypeChange('weekly')}
            >
              今週
            </button>
            <button 
              className={exportType === 'monthly' ? 'active' : ''}
              onClick={() => handleExportTypeChange('monthly')}
            >
              今月
            </button>
            <button 
              className={exportType === 'custom' ? 'active' : ''}
              onClick={() => handleExportTypeChange('custom')}
            >
              カスタム
            </button>
          </div>
        </div>

        <div className="date-range">
          <div className="date-input">
            <label>
              開始日:
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={exportType !== 'custom'}
              />
            </label>
          </div>
          <div className="date-input">
            <label>
              終了日:
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={exportType !== 'custom'}
              />
            </label>
          </div>
        </div>

        <div className="export-actions">
          <h3>エクスポート形式</h3>
          <div className="export-buttons">
            <button 
              onClick={exportToCSV} 
              disabled={loading}
              className="btn-csv"
            >
              <span className="icon">📊</span>
              CSVでエクスポート
            </button>
            <button 
              onClick={exportToJSON} 
              disabled={loading}
              className="btn-json"
            >
              <span className="icon">📄</span>
              JSONでエクスポート
            </button>
          </div>
        </div>
      </div>

      <div className="export-info">
        <h3>エクスポート内容</h3>
        <ul>
          <li>日次KPIデータ（送信数、返信数、面談数など）</li>
          <li>各種コンバージョン率の自動計算</li>
          <li>期間内の合計値と平均値</li>
          <li>メモ・コメント</li>
        </ul>
      </div>

      {loading && <div className="loading-message">エクスポート中...</div>}
    </div>
  );
};

export default DataExport;