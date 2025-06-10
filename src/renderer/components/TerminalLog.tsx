import styled from 'styled-components'
import { shell } from 'electron'
import React, { useEffect, useRef } from 'react'

const TerminalWrapper = styled.div`
  background-color: #000;
  color: #fff;
  padding: 10px;
  font-family: monospace;
  border-radius: 5px;
  height: 300px;
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  &::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #444;
  }
`

const LogLine = styled.div<{ level: string }>`
  color: ${({ level }) =>
    level === 'error' ? '#ff4d4f' : level === 'warn' ? '#faad14' : level === 'success' ? '#52c41a' : '#fff'};
  margin-bottom: 4px;
  word-break: break-word;

  a {
    color: #4ea1ff;
    text-decoration: underline;
    cursor: pointer;
  }
`

export interface LogData {
  level: 'info' | 'warn' | 'error' | 'success'
  log: string
}

const TerminalLog: React.FC<{ logs: LogData[] }> = ({ logs }) => {
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight)
  }, [logs])

  const renderLog = (log: LogData, idx: number) => {
    const parts = log.log.split(/(https?:\/\/[^\s<>"]+)/g)
    return (
      <LogLine key={idx} level={log.level}>
        {parts.map((part, index) =>
          /^https?:\/\//.test(part) ? (
            <a key={index} onClick={() => shell.openExternal(part)}>
              {part}
            </a>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
      </LogLine>
    )
  }

  return <TerminalWrapper ref={terminalRef}>{logs.map((log, idx) => renderLog(log, idx))}</TerminalWrapper>
}

export default TerminalLog
