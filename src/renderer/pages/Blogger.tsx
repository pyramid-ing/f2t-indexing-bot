import React from 'react'
import styled from 'styled-components'
import GoogleAccountSettings from '../components/GoogleAccountSettings'
import BloggerViewer from '../components/BloggerViewer'

const Container = styled.div`
  margin: 20px auto;
  max-width: 1000px;
  padding: 0 20px;
`

const Blogger: React.FC = () => {
  return (
    <Container>
      <GoogleAccountSettings />
      <BloggerViewer />
    </Container>
  )
}

export default Blogger
