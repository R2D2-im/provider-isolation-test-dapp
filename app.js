export function owns(object, property) {
  return (
    object != null && Object.prototype.hasOwnProperty.call(object, property)
  );
}

export function inspectEnvironment(browserWindow) {
  return {
    providerPresent: typeof browserWindow.ethereum?.request === "function",
    imTokenAgentPresent: owns(browserWindow, "imTokenAgent"),
    nestedAgentPresent: owns(browserWindow.imToken, "agent"),
    deviceTokenPresent: owns(browserWindow.imToken, "deviceToken"),
  };
}

export function utf8ToHex(value) {
  const bytes = new TextEncoder().encode(value);
  return `0x${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

export function buildSignMessage(origin) {
  return [
    "imToken QA provider isolation test",
    `Origin: ${origin}`,
    "Purpose: verify personal_sign without exposing private bridge fields.",
  ].join("\n");
}

function setBadge(element, state, label) {
  element.className = `badge ${state}`;
  element.textContent = label;
}

function formatError(error) {
  if (error?.code === 4001) return "用户取消";
  if (error?.message) return error.message;
  return String(error);
}

function startPage(browserWindow, pageDocument) {
  const elements = {
    providerPresent: pageDocument.querySelector("#provider-present"),
    agentAbsent: pageDocument.querySelector("#agent-absent"),
    nestedAgentAbsent: pageDocument.querySelector("#nested-agent-absent"),
    deviceTokenAbsent: pageDocument.querySelector("#device-token-absent"),
    environmentSummary: pageDocument.querySelector("#environment-summary"),
    refresh: pageDocument.querySelector("#refresh"),
    connect: pageDocument.querySelector("#connect"),
    sign: pageDocument.querySelector("#sign"),
    connectResult: pageDocument.querySelector("#connect-result"),
    signResult: pageDocument.querySelector("#sign-result"),
    providerMessage: pageDocument.querySelector("#provider-message"),
    overallResult: pageDocument.querySelector("#overall-result"),
    origin: pageDocument.querySelector("#origin"),
    checkedAt: pageDocument.querySelector("#checked-at"),
  };

  const state = {
    environment: inspectEnvironment(browserWindow),
    account: null,
    connected: false,
    signed: false,
  };

  function privateFieldsAbsent() {
    return (
      !state.environment.imTokenAgentPresent &&
      !state.environment.nestedAgentPresent &&
      !state.environment.deviceTokenPresent
    );
  }

  function renderOverall() {
    const complete =
      state.environment.providerPresent &&
      privateFieldsAbsent() &&
      state.connected &&
      state.signed;

    if (complete) {
      elements.overallResult.className = "overall pass";
      elements.overallResult.textContent =
        "通过：Provider 正常，私有字段未暴露";
      return;
    }

    const privacyFailure = !privateFieldsAbsent();
    if (privacyFailure) {
      elements.overallResult.className = "overall fail";
      elements.overallResult.textContent =
        "不通过：检测到第三方页面可见的私有字段";
      return;
    }

    elements.overallResult.className = "overall pending";
    elements.overallResult.textContent = state.environment.providerPresent
      ? "等待完成连接与签名"
      : "等待可用的 window.ethereum Provider";
  }

  function inspect() {
    state.environment = inspectEnvironment(browserWindow);
    setBadge(
      elements.providerPresent,
      state.environment.providerPresent ? "pass" : "fail",
      state.environment.providerPresent ? "可用" : "不可用",
    );
    setBadge(
      elements.agentAbsent,
      state.environment.imTokenAgentPresent ? "fail" : "pass",
      state.environment.imTokenAgentPresent ? "已暴露" : "未暴露",
    );
    setBadge(
      elements.nestedAgentAbsent,
      state.environment.nestedAgentPresent ? "fail" : "pass",
      state.environment.nestedAgentPresent ? "已暴露" : "未暴露",
    );
    setBadge(
      elements.deviceTokenAbsent,
      state.environment.deviceTokenPresent ? "fail" : "pass",
      state.environment.deviceTokenPresent ? "已暴露" : "未暴露",
    );

    elements.environmentSummary.textContent = privateFieldsAbsent()
      ? "私有字段隔离检查通过。"
      : "私有字段隔离检查失败；不要读取、复制或截图字段值。";
    elements.connect.disabled = !state.environment.providerPresent;
    elements.checkedAt.textContent = `检测时间：${new Date().toLocaleTimeString()}`;
    renderOverall();
  }

  async function connect() {
    setBadge(elements.connectResult, "pending", "请求中");
    elements.providerMessage.textContent = "";
    try {
      const accounts = await browserWindow.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        throw new Error("Provider 未返回有效账户");
      }
      state.account = accounts[0];
      state.connected = true;
      setBadge(elements.connectResult, "pass", "成功");
      elements.sign.disabled = false;
      elements.providerMessage.textContent = "账户连接成功；地址未显示或上传。";
    } catch (error) {
      state.account = null;
      state.connected = false;
      state.signed = false;
      elements.sign.disabled = true;
      setBadge(elements.connectResult, "fail", "失败");
      elements.providerMessage.textContent = `连接失败：${formatError(error)}`;
    }
    renderOverall();
  }

  async function sign() {
    if (!state.account) return;
    setBadge(elements.signResult, "pending", "请求中");
    elements.providerMessage.textContent = "";
    try {
      const message = utf8ToHex(
        buildSignMessage(browserWindow.location.origin),
      );
      const signature = await browserWindow.ethereum.request({
        method: "personal_sign",
        params: [message, state.account],
      });
      if (typeof signature !== "string" || !signature.startsWith("0x")) {
        throw new Error("Provider 未返回有效签名");
      }
      state.signed = true;
      setBadge(elements.signResult, "pass", "成功");
      elements.providerMessage.textContent = "签名成功；签名内容未显示或上传。";
    } catch (error) {
      state.signed = false;
      setBadge(elements.signResult, "fail", "失败");
      elements.providerMessage.textContent = `签名失败：${formatError(error)}`;
    }
    renderOverall();
  }

  elements.origin.textContent = `第三方域：${browserWindow.location.hostname}`;
  elements.refresh.addEventListener("click", inspect);
  elements.connect.addEventListener("click", connect);
  elements.sign.addEventListener("click", sign);

  browserWindow.ethereum?.on?.("accountsChanged", () => {
    state.account = null;
    state.connected = false;
    state.signed = false;
    elements.sign.disabled = true;
    setBadge(elements.connectResult, "pending", "请重新连接");
    setBadge(elements.signResult, "pending", "未执行");
    renderOverall();
  });

  inspect();
  browserWindow.setTimeout(inspect, 500);
  browserWindow.setTimeout(inspect, 1500);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  startPage(window, document);
}
