/*
 * 群务台界面演示 · 数据全部虚构
 * 该脚本在页面任何业务脚本之前执行：
 * 1) 预置 localStorage，跳过首次向导/公告/星标提示；
 * 2) 覆盖 window.fetch，只拦截 /api/*，不产生任何真实网络请求；
 * 3) 注入演示横幅、拦截下载与外部导航；
 * 4) 向父页面发送 ready/error 消息。
 */
(function () {
  'use strict';

  var DEMO_TOKEN = 'demo-token';
  var seeds = {
    qq_digest_token: DEMO_TOKEN,
    nh_theme: 'dark',
    nh_star_prompt: 'never',
    nh_setup_wizard_seen: '1',
    nh_coldstart_guide_closed: '1',
    qq_digest_journey_hidden: '1',
    seen_update_tag: 'v1.1.0-beta.11'
  };
  Object.keys(seeds).forEach(function (key) {
    try { localStorage.setItem(key, seeds[key]); } catch (error) {}
  });

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function at(offsetDays, hour, minute) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour || 0, minute || 0, 0, 0);
    return d;
  }

  // 同一时刻打开演示都不难看：今天的时间点若已过（或太近），顺延到明天
  function upcoming(hour, minute) {
    var d = new Date();
    d.setHours(hour || 0, minute || 0, 0, 0);
    if (d.getTime() < Date.now() + 60 * 60 * 1000) d.setDate(d.getDate() + 1);
    return d;
  }

  function stamp(date) {
    return (
      date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) + ':' + pad(date.getMinutes())
    );
  }

  function displayStamp(date) {
    return (
      date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
    );
  }

  function deadlineLabel(date) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var due = new Date(date);
    due.setHours(0, 0, 0, 0);
    var diff = Math.round((due - today) / 86400000);
    var hm = pad(date.getHours()) + ':' + pad(date.getMinutes());
    if (diff === 0) return '今天 ' + hm;
    if (diff === 1) return '明天 ' + hm;
    if (diff === -1) return '昨天 ' + hm;
    if (diff < 0) return Math.abs(diff) + ' 天前';
    return diff + ' 天后';
  }

  function makeTask(id, summary, category, deadline, extra) {
    extra = extra || {};
    return {
      id: id,
      summary: summary,
      text: summary,
      category: category,
      deadline: deadline ? stamp(deadline) : '',
      deadline_text: deadline ? deadlineLabel(deadline) : '无截止时间',
      created_at: stamp(at(-1, 9, 10)),
      done: !!extra.done,
      overdue: false,
      pinned: !!extra.pinned,
      snoozed: false,
      snooze_text: '',
      groups: extra.groups || [],
      source: 'qqbot',
      source_text: extra.source_text || summary,
      evidence: extra.evidence || '',
      details: extra.details || [],
      audience: extra.audience || '',
      condition: extra.condition || '',
      confidence_text: extra.confidence_text || '较高',
      confidence_reason: extra.confidence_reason || '含明确截止时间与适用对象',
      duplicate_summary: '',
      urgent_override: null,
      effective_urgent: category === 'urgent',
      candidate: !!extra.candidate
    };
  }

  var tasks = [
    makeTask(1, '国家励志奖学金材料提交', 'urgent', upcoming(18, 0), {
      groups: ['年级通知群'],
      pinned: true,
      details: ['材料：成绩单、申请表、家庭情况说明', '提交地点：学院学工办 302'],
      audience: '大二及以上',
      condition: '已通过家庭经济困难认定',
      evidence: '【通知】请于本周五 18:00 前提交国家励志奖学金材料，逾期不再受理。'
    }),
    makeTask(2, '杭州应届生生活补贴申报', 'action', at(3, 17, 30), {
      groups: ['就业信息群'],
      details: ['需劳动合同、社保缴纳记录、毕业证', '入口：杭州市民卡 App → 应届生补贴'],
      audience: '应届毕业生',
      condition: '毕业 2 年内且在杭就业',
      evidence: '杭州应届生生活补贴开始申报，截止本月底，材料清单见群文件。'
    }),
    makeTask(3, '互联网+ 校赛报名', 'academic', at(6, 23, 59), {
      groups: ['竞赛通知群'],
      details: ['组队表在群文件', '校赛初评 11 月上旬'],
      audience: '全体在校生',
      evidence: '关于举办“互联网+”大学生创新创业大赛校赛的通知，报名截止本周日。'
    }),
    makeTask(4, '图书馆逾期图书归还', 'action', upcoming(21, 0), {
      groups: ['图书馆通知群'],
      pinned: true,
      details: ['《数据结构》已逾期 2 天', '可在自助借还机办理'],
      evidence: '您借阅的图书已逾期，请尽快归还，逾期将暂停借阅权限。'
    }),
    makeTask(5, '选课补退选截止', 'academic', at(12, 17, 0), {
      groups: ['教务通知群'],
      details: ['补退选结束后不再受理', '入口：教务系统 → 选课'],
      audience: '全体本科生',
      evidence: '本学期补退选将于两周后 17:00 关闭，请及时确认课表。'
    }),
    makeTask(6, '实习三方协议盖章', 'action', at(-2, 17, 0), {
      groups: ['就业信息群'],
      details: ['先找企业盖章，再到学院就业办', '工作日上午办理'],
      audience: '毕业年级',
      evidence: '三方协议请于本周内交至就业办，逾期影响派遣。'
    }),
    makeTask(7, '社团活动报名', 'info', at(-1, 12, 0), {
      groups: ['社团群'],
      done: true,
      evidence: '周五晚社团破冰活动，想参加的接龙。'
    }),
    makeTask(8, '考研报名网上确认', 'academic', at(9, 22, 0), {
      groups: ['考研交流群'],
      candidate: true,
      details: ['需上传身份证、学生证照片', '确认后不可修改报考点'],
      audience: '考研报名考生',
      evidence: '网上确认时间已公布，请提前准备材料。'
    }),
    makeTask(9, '宿舍水电费缴纳', 'info', at(4, 20, 0), {
      groups: ['楼栋群'],
      evidence: '本月水电费已出账，请在周五前完成缴纳。'
    })
  ];

  var pinnedIds = [1, 4];

  function dateKey(date) {
    var d = new Date(date);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function daysFromToday(date) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - today) / 86400000);
  }

  function sortByDeadline(list) {
    return list.slice().sort(function (a, b) {
      return String(a.deadline || '9999').localeCompare(String(b.deadline || '9999'));
    });
  }

  function buildTasks() {
    var now = new Date();
    tasks.forEach(function (task) {
      task.effective_urgent = task.urgent_override === true ||
        (task.urgent_override !== false && task.category === 'urgent');
      task.overdue = !task.done && !!task.deadline && new Date(task.deadline) < now;
      task.deadline_text = task.deadline ? deadlineLabel(new Date(task.deadline)) : '无截止时间';
    });

    var open = tasks.filter(function (t) { return !t.done; });
    var done = tasks.filter(function (t) { return t.done; });
    var today = [];
    var week = [];
    var later = [];
    var candidates = [];

    open.forEach(function (task) {
      if (task.candidate) { candidates.push(task); return; }
      if (!task.deadline) { later.push(task); return; }
      var diff = daysFromToday(new Date(task.deadline));
      if (diff <= 0) today.push(task);
      else if (diff <= 7) week.push(task);
      else later.push(task);
    });

    var overdue = open.filter(function (t) { return t.overdue; }).length;
    var dueToday = today.filter(function (t) { return !t.overdue; });
    var headline = dueToday.length
      ? '今天 ' + dueToday.length + ' 件' + (overdue ? '，另有 ' + overdue + ' 件已逾期' : '，最紧的是' + dueToday[0].summary)
      : overdue
        ? '今天没有到期，' + overdue + ' 件已逾期'
        : week.length
          ? '今天没有待办，未来 7 天 ' + week.length + ' 件'
          : '今天没有待办';
    var total = tasks.length;
    var progress = total ? Math.round((done.length / total) * 100) : 0;

    return {
      headline: headline,
      subline: '演示数据 · 共 ' + tasks.length + ' 件，订阅 3 个群',
      progress: progress,
      stats: { open: open.length, overdue: overdue, done: done.length },
      today: sortByDeadline(today),
      week: sortByDeadline(week),
      candidates: sortByDeadline(candidates),
      later: sortByDeadline(later),
      done: sortByDeadline(done),
      pinned: sortByDeadline(tasks.filter(function (t) { return t.pinned && !t.done; }))
    };
  }

  var noticeItems = [
    {
      kind: 'urgent',
      created_at: displayStamp(at(0, 8, 5)),
      body: '【演示】国家励志奖学金材料今天 18:00 截止，需成绩单与申请表。'
    },
    {
      kind: 'window',
      created_at: displayStamp(at(-1, 21, 0)),
      body: '【演示】本周摘要：3 条待办，1 条已逾期。'
    },
    {
      kind: 'silent',
      created_at: displayStamp(at(-2, 9, 0)),
      body: '【演示】已归档 12 条非通知消息。'
    }
  ];

  var inboxItems = [
    {
      msg_id: 'demo-msg-1',
      received_at: displayStamp(at(0, 8, 2)),
      group_name: '年级通知群',
      group_id: '10001',
      sender_name: '辅导员',
      verdict: 'notice',
      reason: '含明确截止时间与材料清单',
      method: 'heuristic',
      content: '【演示】请于今天 18:00 前提交国家励志奖学金材料：成绩单、申请表、家庭情况说明。',
      source: 'onebot',
      task_id: 1
    },
    {
      msg_id: 'demo-msg-2',
      received_at: displayStamp(at(0, 7, 40)),
      group_name: '就业信息群',
      group_id: '10002',
      sender_name: '就业办老师',
      verdict: 'notice',
      reason: '含申报对象与截止时间',
      method: 'mixed',
      content: '【演示】杭州应届生生活补贴开始申报，毕业 2 年内可办，截止本月底。',
      source: 'onebot',
      task_id: 2
    },
    {
      msg_id: 'demo-msg-3',
      received_at: displayStamp(at(-1, 19, 12)),
      group_name: '竞赛通知群',
      group_id: '10003',
      sender_name: '竞赛负责人',
      verdict: 'suspect',
      reason: '像通知但缺少明确截止日期',
      method: 'heuristic',
      content: '【演示】互联网+ 校赛近期启动，具体安排等通知。',
      source: 'onebot',
      task_id: null
    },
    {
      msg_id: 'demo-msg-4',
      received_at: displayStamp(at(-1, 15, 3)),
      group_name: '社团群',
      group_id: '10004',
      sender_name: '同学',
      verdict: 'noise',
      reason: '聊天内容，无行动项',
      method: 'heuristic',
      content: '【演示】今晚有人一起去食堂吗？',
      source: 'onebot',
      task_id: null
    }
  ];

  var groups = [
    { group_id: '10001', name: '年级通知群', selected: true },
    { group_id: '10002', name: '就业信息群', selected: true },
    { group_id: '10003', name: '竞赛通知群', selected: true },
    { group_id: '10004', name: '社团群', selected: false },
    { group_id: '10005', name: '考研交流群', selected: false }
  ];

  var settings = {
    ok: true,
    napcat_dir: 'C:\\演示\\NapCat',
    qq_enabled: true,
    quiet_hours: '23:00–07:00',
    reminders: '截止前 7/3/1 天',
    channels: ['日历订阅'],
    wechat_enabled: false,
    wechat_group_whitelist: [],
    wechat_group_aliases: {},
    wechat_scan_interval_seconds: 300,
    dingtalk_enabled: false,
    dingtalk_group_whitelist: [],
    chaoxing_enabled: false,
    chaoxing_group_whitelist: [],
    chaoxing_cookie: { has_cookie: false },
    chaoxing_status: { has_cookie: false, expired: false, last_sync_at: displayStamp(at(-1, 21, 10)) }
  };

  var llmState = {
    provider: 'off',
    enabled: false,
    key_set: false,
    key_masked: '',
    model: '',
    vision: false
  };

  var meta = {
    ok: true,
    providers: [
      {
        id: 'off',
        name: '不用 AI（只归档）',
        hint: '不配置也能用：本地规则会把通知变成待办。',
        model: '',
        endpoint: '',
        needs_key: false,
        key_steps: [],
        key_url: ''
      },
      {
        id: 'deepseek',
        name: 'DeepSeek',
        hint: '有免费额度，中文通知理解不错。',
        model: 'deepseek-chat',
        endpoint: 'https://api.deepseek.com',
        needs_key: true,
        key_steps: ['打开官网注册', '创建 API Key', '粘贴到下面'],
        key_url: 'https://platform.deepseek.com/'
      },
      {
        id: 'zhipu',
        name: '智谱 GLM',
        hint: '国内访问稳定，有免费模型。',
        model: 'glm-4-flash',
        endpoint: 'https://open.bigmodel.cn/api/paas/v4',
        needs_key: true,
        key_steps: ['注册并实名', '创建 API Key', '粘贴到下面'],
        key_url: 'https://open.bigmodel.cn/'
      },
      {
        id: 'ollama',
        name: '本地 Ollama',
        hint: '完全离线，需要自己先装模型。',
        model: 'qwen2.5:7b',
        endpoint: 'http://127.0.0.1:11434',
        needs_key: false,
        key_steps: ['安装 Ollama', '拉取一个中文模型', '保持 Ollama 运行'],
        key_url: 'https://ollama.com/'
      }
    ],
    llm: llmState,
    push_help: {
      wxpusher: 'https://wxpusher.zjiecode.com/',
      serverchan: 'https://sct.ftqq.com/',
      pushplus: 'https://www.pushplus.plus/'
    },
    push: {
      wxpusher_app_token: { set: false, masked: [] },
      wxpusher_uids: { set: false, masked: [] },
      wxpusher_topic_ids: { set: false, masked: [] },
      serverchan_keys: { set: false, masked: [] },
      pushplus_tokens: { set: false, masked: [] },
      webhook_urls: { set: false, masked: [] }
    },
    groups: ['年级通知群', '就业信息群', '竞赛通知群'],
    channels: ['日历订阅'],
    reminders: '截止前 7/3/1 天',
    push_budget: '演示模式不限',
    quiet_hours: '23:00–07:00',
    stats: { total: 9, open: 8, done: 1 },
    started_at: displayStamp(at(0, 8, 0)),
    insights: []
  };

  var selfcheck = {
    ok: true,
    last_push_at: null,
    items: [
      { state: 'ok', label: '本机服务', value: '正常', hint: '演示模式：没有真实后端。' },
      { state: 'ok', label: 'QQ 接入', value: '演示账号', hint: '所有账号与群均为虚构。' },
      { state: 'ok', label: '待办数据库', value: '9 件', hint: '数据只存在于当前页面内存。' },
      { state: 'warn', label: '消息推送', value: '未配置', hint: '演示模式不会向任何外部通道发送消息。' }
    ]
  };

  function inboxResponse(query) {
    var verdict = query.get('verdict') || 'all';
    var items = inboxItems.filter(function (item) {
      if (verdict === 'all') return true;
      if (verdict === 'promoted') return !!item.task_id;
      return item.verdict === verdict;
    });
    return {
      ok: true,
      total: items.length,
      counts: {
        notice: inboxItems.filter(function (i) { return i.verdict === 'notice'; }).length,
        suspect: inboxItems.filter(function (i) { return i.verdict === 'suspect'; }).length,
        noise: inboxItems.filter(function (i) { return i.verdict === 'noise'; }).length,
        promoted: inboxItems.filter(function (i) { return !!i.task_id; }).length
      },
      items: items
    };
  }

  function response(payload, status) {
    status = status || 200;
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status: status,
      headers: { get: function () { return 'application/json'; } },
      json: function () { return Promise.resolve(payload); },
      text: function () { return Promise.resolve(JSON.stringify(payload)); },
      blob: function () {
        return Promise.resolve(new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      }
    });
  }

  function getJsonBody(init) {
    try {
      return init && init.body ? JSON.parse(init.body) : {};
    } catch (error) {
      return {};
    }
  }

  function findTask(id) {
    var numeric = Number(id);
    return tasks.find(function (task) { return Number(task.id) === numeric; }) || null;
  }

  function handleGet(path, query) {
    if (path === '/api/tasks') return buildTasks();
    if (path === '/api/notices') return { ok: true, items: noticeItems };
    if (path === '/api/inbox') return inboxResponse(query);
    if (path === '/api/napcat/status') {
      return {
        ok: true,
        online: true,
        nickname: '演示账号',
        napcat_installed: true,
        napcat_running: true,
        napcat_root: 'C:\\演示\\NapCat',
        qr_stamp: 'demo'
      };
    }
    if (path === '/api/napcat/groups') return { ok: true, groups: groups };
    if (path === '/api/groups/suggest') {
      return {
        ok: true,
        source: 'heuristic',
        groups: [
          { group_id: '10001', name: '年级通知群', category: 'course', suggested: true, reason: '历史通知密度高' },
          { group_id: '10002', name: '就业信息群', category: 'course', suggested: true, reason: '含截止日期' },
          { group_id: '10003', name: '竞赛通知群', category: 'activity', suggested: true, reason: '活动通知' },
          { group_id: '10004', name: '社团群', category: 'chat', suggested: false, reason: '' },
          { group_id: '10005', name: '考研交流群', category: 'chat', suggested: false, reason: '' }
        ]
      };
    }
    if (path === '/api/hosting/status') {
      return { ok: true, hosting_active: true, napcat_running: true, napcat_online: true, groups_selected: 3 };
    }
    if (path === '/api/sync/info') {
      return {
        ok: true,
        calendars: [{
          name: '本机地址（演示）',
          url: 'http://127.0.0.1:8766/calendar.ics?token=demo',
          hint: '演示模式不会真正订阅'
        }],
        events: 5
      };
    }
    if (path === '/api/setup/status') {
      return {
        ok: true,
        platforms: {
          qq: { configured: true, status: 'ready' },
          wechat: { configured: true, status: 'ready' },
          dingtalk: { configured: true, status: 'ready' },
          chaoxing: { configured: true, status: 'ready' },
          push: { configured: true, status: 'ready' },
          llm: { configured: true, status: 'ready' }
        }
      };
    }
    if (path === '/api/onboarding') return { required: false };
    if (path === '/api/announcements') return { ok: true, items: [], checking: false };
    if (path === '/api/update') {
      return {
        ok: true,
        has_update: false,
        checking: false,
        current: { version: 'v1.1.0-beta.11', tag: 'v1.1.0-beta.11' },
        checked_at: displayStamp(at(0, 8, 0)),
        channel: 'beta',
        download: { state: 'idle' }
      };
    }
    if (path === '/api/chaoxing/status') {
      return { ok: true, expired: false, has_cookie: true, last_sync_at: displayStamp(at(-1, 21, 10)) };
    }
    if (path === '/api/chaoxing/cookie/status') {
      return { has_cookie: true, result: '演示模式（未真实校验）', last_checked_at: displayStamp(at(0, 8, 0)) };
    }
    if (path === '/api/qq/groups/status') {
      return { is_fetching: false, last_success_at: displayStamp(at(0, 8, 1)), group_count: 3 };
    }
    if (path === '/api/dingtalk/status') return { state: '未启用（演示）', scan_state: 'disabled' };
    if (path === '/api/wechat/status') return { state: '未启用（演示）', scan_state: 'disabled' };
    if (path === '/api/history/fetch/status') return { running: false };
    if (path === '/api/inbox/classify/status') return { running: false };
    if (path === '/api/pair/info') {
      return {
        ok: true,
        candidates: [],
        base: '',
        steps: ['演示模式：手机配对与公网入口已停用。'],
        qr_error: '演示模式已停用手机配对'
      };
    }
    if (path === '/api/pair/pending') return { ok: true, pending: [] };
    if (path === '/api/settings') return settings;
    if (path === '/api/meta') return meta;
    if (path === '/api/selfcheck') return selfcheck;
    if (path === '/api/health') return { ok: true };
    return { ok: true };
  }

  function handlePost(path, body) {
    if (path === '/api/tasks/pin') {
      var pinTask = findTask(body.task_id);
      if (pinTask) {
        pinTask.pinned = !!body.pinned;
        if (pinTask.pinned && pinnedIds.indexOf(Number(pinTask.id)) < 0) pinnedIds.push(Number(pinTask.id));
        if (!pinTask.pinned) pinnedIds = pinnedIds.filter(function (id) { return id !== Number(pinTask.id); });
      }
      return { ok: true };
    }
    if (path === '/api/tasks/urgent') {
      var urgentTask = findTask(body.task_id);
      if (urgentTask) urgentTask.urgent_override = body.urgent;
      return { ok: true };
    }
    if (path === '/api/tasks/create') {
      var newId = tasks.reduce(function (max, task) { return Math.max(max, Number(task.id)); }, 0) + 1;
      var created = makeTask(newId, body.summary || '手动新建的待办', 'info', body.deadline ? new Date(body.deadline) : null, {
        groups: ['手动创建']
      });
      created.created_at = stamp(new Date());
      tasks.push(created);
      return { ok: true, task_id: newId, summary: created.summary, deadline: created.deadline };
    }
    if (path.indexOf('/api/tasks/') === 0) {
      var actionTask = findTask(path.slice('/api/tasks/'.length));
      if (actionTask) {
        if (body.action === 'done') actionTask.done = true;
        else if (body.action === 'reopen') actionTask.done = false;
        else if (body.action === 'snooze') actionTask.snoozed = true;
        else if (body.action === 'unsnooze') actionTask.snoozed = false;
        else if (body.action === 'delete') tasks = tasks.filter(function (t) { return t !== actionTask; });
      }
      return { ok: true };
    }
    if (path === '/api/inbox/promote') {
      var item = inboxItems.find(function (entry) { return entry.msg_id === body.msg_id; });
      if (item && !item.task_id) {
        var promoteId = tasks.reduce(function (max, task) { return Math.max(max, Number(task.id)); }, 0) + 1;
        tasks.push(makeTask(promoteId, String(body.title || item.content || '收件箱转待办').slice(0, 60), 'info', at(7, 18, 0), {
          groups: [item.group_name]
        }));
        item.task_id = promoteId;
        return { ok: true, task_id: promoteId };
      }
      return { ok: true, task_id: item ? item.task_id : null };
    }
    if (path === '/api/settings') {
      Object.keys(body).forEach(function (key) {
        if (key.indexOf('llm_') === 0) return;
        settings[key] = body[key];
      });
      if (body.llm_provider) {
        llmState.provider = body.llm_provider;
        llmState.enabled = body.llm_provider !== 'off';
        llmState.key_set = !!body.llm_api_key;
        llmState.model = body.llm_model || '';
      }
      return Object.assign({ ok: true }, settings, { llm: llmState });
    }
    if (path === '/api/settings/test-llm' || path === '/api/settings/test-push') {
      return { ok: false, error: '演示模式已停用外部请求' };
    }
    if (path === '/api/subscriptions') return { ok: true, applied: true };
    if (path === '/api/onboarding/accept') return { ok: true };
    if (path === '/api/hosting/start' || path === '/api/hosting/stop') {
      return { ok: true, napcat_online: true };
    }
    if (path === '/api/chaoxing/cookie/validate') {
      return { ok: true, result: '演示模式（未真实校验）' };
    }
    if (path === '/api/chaoxing/auto_cookie') {
      return { ok: false, category: 'browser_unavailable', source: 'demo', next_step: '演示模式不会读取本机浏览器。' };
    }
    if (path === '/api/chaoxing/courses') return { ok: true, courses: [] };
    if (path === '/api/update/download') return { ok: false, error: '演示模式已停用下载' };
    if (path === '/api/tunnel/start') return { ok: false, error: '演示模式已停用公网入口' };
    if (path === '/api/firewall/allow') return { ok: false, error: '演示模式已停用系统操作' };
    if (path === '/api/history/fetch' || path === '/api/inbox/classify') {
      return { ok: false, started: false, error: '演示模式已停用历史回溯' };
    }
    if (path === '/api/dingtalk/scan' || path === '/api/wechat/scan') {
      return { ok: false, error: '演示模式已停用实验性通道' };
    }
    return { ok: true };
  }

  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var parsed;
    try { parsed = new URL(url, location.href); } catch (error) { parsed = null; }
    var path = parsed ? parsed.pathname : String(url);
    var apiIndex = path.indexOf('/api/');
    if (apiIndex < 0) {
      if (nativeFetch) return nativeFetch(input, init);
      return response({ ok: false, error: '演示模式已停用网络请求' }, 403);
    }
    path = path.slice(apiIndex);
    if (method === 'GET') return response(handleGet(path, parsed.searchParams));
    return response(handlePost(path, getJsonBody(init)));
  };

  function showToast(text) {
    var node = document.getElementById('radar-demo-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'radar-demo-toast';
      node.setAttribute('role', 'status');
      node.style.cssText = [
        'position:fixed', 'left:0', 'right:0', 'bottom:56px', 'margin-inline:auto',
        'width:max-content', 'z-index:2147483001',
        'max-width:calc(100vw - 32px)', 'padding:7px 12px',
        'border-radius:8px', 'background:rgba(10,12,18,.94)',
        'border:1px solid rgba(255,255,255,.16)', 'color:#f3f5fa',
        'font:12px/1.5 system-ui,sans-serif', 'text-align:center', 'pointer-events:none',
        'box-shadow:0 10px 30px rgba(0,0,0,.45)'
      ].join(';');
      document.body.appendChild(node);
    }
    node.textContent = text;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { node.remove(); }, 1800);
  }

  function injectBanner() {
    if (document.getElementById('radar-demo-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'radar-demo-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('data-pagefind-ignore', '');
    banner.textContent = '演示数据 · 群、账号、截止时间全部虚构';
    banner.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'bottom:8px', 'margin-inline:auto',
      'width:max-content', 'z-index:2147483000',
      'max-width:calc(100vw - 20px)', 'padding:5px 10px',
      'border-radius:999px', 'background:rgba(10,12,18,.82)',
      'border:1px solid rgba(241,187,100,.4)', 'color:#f1bb64',
      'font:11px/1.5 system-ui,sans-serif', 'text-align:center', 'pointer-events:none',
      'backdrop-filter:blur(6px)', 'white-space:nowrap'
    ].join(';');
    document.body.appendChild(banner);
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (link.hasAttribute('download') || href.indexOf('/api/') === 0 || href.indexOf('/calendar.ics') === 0) {
      event.preventDefault();
      showToast('演示模式已停用这个操作');
      return;
    }
    if (/^https?:/i.test(href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }, true);

  var readySent = false;
  function notifyReady() {
    if (readySent) return;
    readySent = true;
    try { parent.postMessage({ type: 'radar-demo-ready' }, '*'); } catch (error) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectBanner();
    window.setTimeout(notifyReady, 300);
  });
  window.addEventListener('load', function () { window.setTimeout(notifyReady, 200); });
  window.setTimeout(notifyReady, 2000);

  window.addEventListener('error', function (event) {
    try {
      parent.postMessage({ type: 'radar-demo-error', message: String((event && event.message) || '') }, '*');
    } catch (error) {}
  });
  window.addEventListener('unhandledrejection', function (event) {
    try {
      parent.postMessage({ type: 'radar-demo-error', message: String((event && event.reason) || '') }, '*');
    } catch (error) {}
  });
})();
