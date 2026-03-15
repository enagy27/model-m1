type ISocket = {
  readonly host: string;
  write(address: string): void;
};

type ControlRequests = {
  SetAudioConfig: {
    digitalFilter: "FILTER_1";
  };
};

export function control(socket: ISocket) {
  return async function () {
    const encodedAudioConfig = `&lt;AudioConfig&gt;&lt;digitalFilter&gt;FILTER_1&lt;/digitalFilter&gt;&lt;/AudioConfig&gt;`;
    const body = [
      `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">`,
      `  <s:Body>`,
      `    <u:SetAudioConfig xmlns:u="urn:schemas-denon-com:service:ACT:1">`,
      `      <AudioConfig>${encodedAudioConfig}</AudioConfig>`,
      `    </u:SetAudioConfig>`,
      `  </s:Body>`,
      `</s:Envelope>`,
      ``
    ]
      .map((line) => line.trim())
      .join("\r\n");

    const contentLength = Buffer.byteLength(body);

    socket.write(
      [
        `POST /ACT/control HTTP/1.1`,
        `HOST: ${socket.host}`,
        `CONTENT-LENGTH: ${contentLength}`,
        `Accept-Ranges: bytes`,
        `CONTENT-TYPE: text/xml; charset="utf-8"`,
        `SOAPACTION: "urn:schemas-denon-com:service:ACT:1#SetAudioConfig"`,
        `USER-AGENT: LINUX UPnP/1.0 Denon-Heos/1dcbe52d2ca0d06c05ba328fca782ca3dbd262e6`,
        ``,
        body,
      ].join("\r\n"),
    );
  };
}

export type ControlInstance = ReturnType<typeof control>;
