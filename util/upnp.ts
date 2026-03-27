type SearchArgs = {
  host: string;
  service: string;
};

export function search({ host, service }: SearchArgs): string {
  return [
    `M-SEARCH * HTTP/1.1`,
    `HOST: ${host}`,
    `MAN: "ssdp:discover"`,
    `ST: ${service}`,
    `MX: 3`,
    ``,
    ``,
  ].join("\r\n");
}
