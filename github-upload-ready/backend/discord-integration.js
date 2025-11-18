// Discord通知機能
const axios = require('axios');

class DiscordNotifier {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl || process.env.DISCORD_WEBHOOK_URL;
  }

  // 日次入力通知
  async sendDailyKPINotification(userId, kpiData) {
    if (!this.webhookUrl) return;

    const totalEmails = (kpiData.emails_sent_manual || 0) + (kpiData.emails_sent_outsource || 0);
    const totalValidEmails = (kpiData.valid_emails_manual || 0) + (kpiData.valid_emails_outsource || 0);
    
    const embed = {
      embeds: [{
        title: "📊 日次KPIが記録されました",
        color: 0x00ff00,
        fields: [
          {
            name: "📧 メール送信",
            value: `手動: ${kpiData.emails_sent_manual || 0}\n外注: ${kpiData.emails_sent_outsource || 0}\n合計: ${totalEmails}`,
            inline: true
          },
          {
            name: "✅ 有効メール",
            value: `手動: ${kpiData.valid_emails_manual || 0}\n外注: ${kpiData.valid_emails_outsource || 0}\n合計: ${totalValidEmails}`,
            inline: true
          },
          {
            name: "💬 返信・会議",
            value: `返信: ${kpiData.replies_received || 0}\n会議: ${kpiData.meetings_scheduled || 0}`,
            inline: true
          },
          {
            name: "💰 成約・案件",
            value: `成約: ${kpiData.deals_closed || 0}\n案件: ${kpiData.projects_created || 0}`,
            inline: true
          },
          {
            name: "📈 エンゲージメント",
            value: `スライド閲覧: ${kpiData.slide_views || 0}\n動画閲覧: ${kpiData.video_views || 0}`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `記録日: ${kpiData.date}`
        }
      }]
    };

    if (kpiData.notes) {
      embed.embeds[0].fields.push({
        name: "📝 メモ",
        value: kpiData.notes,
        inline: false
      });
    }

    try {
      await axios.post(this.webhookUrl, embed);
      return true;
    } catch (error) {
      console.error('Discord notification failed:', error);
      return false;
    }
  }

  // 週次レビュー通知
  async sendWeeklyReviewNotification(summary, review, goals) {
    if (!this.webhookUrl) return;

    const totalEmails = summary.totals.emails_sent_manual + summary.totals.emails_sent_outsource;
    const totalValidEmails = summary.totals.valid_emails_manual + summary.totals.valid_emails_outsource;

    const embed = {
      embeds: [{
        title: "📈 週次レビューサマリー",
        color: 0x0099ff,
        fields: [
          {
            name: "📊 週次実績",
            value: `メール送信: ${totalEmails}\n有効メール: ${totalValidEmails}\n返信数: ${summary.totals.replies_received}\n会議数: ${summary.totals.meetings_scheduled}\n成約数: ${summary.totals.deals_closed}`,
            inline: true
          },
          {
            name: "📈 達成率",
            value: `返信率: ${summary.reply_rate}%\n会議設定率: ${summary.meeting_rate}%\n成約率: ${summary.deal_rate}%\nプロジェクト率: ${summary.project_rate}%`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    // レビュー内容を追加
    if (review) {
      if (review.achievements) {
        embed.embeds[0].fields.push({
          name: "✅ 今週の成果",
          value: review.achievements.substring(0, 1024),
          inline: false
        });
      }
      
      if (review.challenges) {
        embed.embeds[0].fields.push({
          name: "⚠️ 課題・改善点",
          value: review.challenges.substring(0, 1024),
          inline: false
        });
      }
      
      if (review.improvements) {
        embed.embeds[0].fields.push({
          name: "🎯 来週のアクション",
          value: review.improvements.substring(0, 1024),
          inline: false
        });
      }
    }

    try {
      await axios.post(this.webhookUrl, embed);
      return true;
    } catch (error) {
      console.error('Discord notification failed:', error);
      return false;
    }
  }

  // 目標達成アラート
  async sendGoalAchievementAlert(metric, achieved, target) {
    if (!this.webhookUrl) return;

    const percentage = ((achieved / target) * 100).toFixed(1);
    const isAchieved = achieved >= target;

    const embed = {
      embeds: [{
        title: isAchieved ? "🎉 目標達成！" : "📊 進捗アップデート",
        color: isAchieved ? 0x00ff00 : 0xffaa00,
        fields: [
          {
            name: "指標",
            value: metric,
            inline: true
          },
          {
            name: "達成状況",
            value: `${achieved} / ${target}`,
            inline: true
          },
          {
            name: "達成率",
            value: `${percentage}%`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    try {
      await axios.post(this.webhookUrl, embed);
      return true;
    } catch (error) {
      console.error('Discord notification failed:', error);
      return false;
    }
  }

  // 営業文変更通知
  async sendSalesTemplateChangeNotification(type, totalCount) {
    if (!this.webhookUrl) return;

    const isManual = type === 'manual';
    const threshold = isManual ? 200 : 500;
    const cycleNumber = Math.floor(totalCount / threshold);
    
    const embed = {
      embeds: [{
        title: "🔄 営業文変更のお知らせ",
        color: 0xff9900,
        description: isManual 
          ? `手動営業が${totalCount}件に到達しました！\n営業文の見直し・改善をおすすめします。`
          : `外注営業が${totalCount}件に到達しました！\n営業文の見直し・改善をおすすめします。`,
        fields: [
          {
            name: "📧 送信タイプ",
            value: isManual ? "手動営業" : "外注営業",
            inline: true
          },
          {
            name: "📊 累計送信数",
            value: `${totalCount}件`,
            inline: true
          },
          {
            name: "🔢 サイクル数",
            value: `第${cycleNumber}サイクル`,
            inline: true
          },
          {
            name: "💡 推奨アクション",
            value: "• 現在の営業文の成果を分析\n• 返信率を確認\n• A/Bテストの実施\n• 新しい訴求ポイントの検討",
            inline: false
          },
          {
            name: "📝 チェックポイント",
            value: isManual 
              ? "• 件名の最適化\n• パーソナライゼーション要素の追加\n• CTAの明確化"
              : "• ターゲティングの見直し\n• 配信時間の最適化\n• テンプレートの多様化",
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `次回通知: ${totalCount + threshold}件到達時`
        }
      }]
    };

    try {
      await axios.post(this.webhookUrl, embed);
      return true;
    } catch (error) {
      console.error('Discord notification failed:', error);
      return false;
    }
  }
}

// GPTs連携機能
class GPTsIntegration {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  // 週次レビューの自動分析
  async analyzeWeeklyPerformance(weeklyData, goals) {
    if (!this.apiKey) {
      return { error: 'OpenAI API key not configured' };
    }

    const prompt = `
    以下の営業KPIデータを分析して、改善提案を提供してください：

    【週次実績】
    - メール送信数: ${weeklyData.totals.emails_sent_manual + weeklyData.totals.emails_sent_outsource}
    - 有効メール数: ${weeklyData.totals.valid_emails_manual + weeklyData.totals.valid_emails_outsource}
    - 返信数: ${weeklyData.totals.replies_received}
    - 会議設定数: ${weeklyData.totals.meetings_scheduled}
    - 成約数: ${weeklyData.totals.deals_closed}
    - 返信率: ${weeklyData.reply_rate}%
    - 会議設定率: ${weeklyData.meeting_rate}%
    - 成約率: ${weeklyData.deal_rate}%

    【分析項目】
    1. パフォーマンスの良い点
    2. 改善が必要な点
    3. 具体的な改善アクション（3つ）
    4. 来週の重点目標

    簡潔で実践的なアドバイスをお願いします。
    `;

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: '営業KPIの専門アドバイザーとして、データに基づいた実践的な改善提案を提供してください。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        analysis: response.data.choices[0].message.content
      };
    } catch (error) {
      console.error('GPT analysis failed:', error);
      return {
        success: false,
        error: 'Analysis failed'
      };
    }
  }

  // メールテンプレートの改善提案
  async suggestEmailImprovement(currentTemplate, replyRate) {
    if (!this.apiKey) {
      return { error: 'OpenAI API key not configured' };
    }

    const prompt = `
    現在の返信率が${replyRate}%のメールテンプレートを改善してください。

    【改善ポイント】
    1. 件名の最適化
    2. 本文の構成改善
    3. CTAの強化
    4. パーソナライゼーション要素の追加

    具体的な改善例を示してください。
    `;

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 800
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        suggestions: response.data.choices[0].message.content
      };
    } catch (error) {
      console.error('GPT suggestion failed:', error);
      return {
        success: false,
        error: 'Suggestion failed'
      };
    }
  }
}

module.exports = { DiscordNotifier, GPTsIntegration };