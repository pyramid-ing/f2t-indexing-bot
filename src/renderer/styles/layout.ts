import styled from 'styled-components'

export const Wrapper = styled.div`
  min-height: 100vh;
  background-color: #f9fafb;
  display: flex;
  flex-direction: column;
`

export const Header = styled.header`
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

export const Content = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 0;
  height: 80vh;
  display: flex;
  flex-direction: column;
`

export const Footer = styled.footer`
  background-color: #fff;
  padding: 16px;
  text-align: center;
  color: #6b7280;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.1);
`

export const Title = styled.h1`
  font-size: 24px;
  font-weight: bold;
`

export const SubTitle = styled.h2`
  font-size: 18px;
  margin-bottom: 16px;
`

export const SectionTitle = styled.h3`
  font-size: 16px;
  margin-bottom: 8px;
`
