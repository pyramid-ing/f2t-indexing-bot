import React, { useState, useEffect } from 'react'
import { Card, Button, List, Space, Typography, message, Spin, Select, Input, Tag } from 'antd'
import { ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import { getValidAccessToken } from '../utils/googleAuth'
import { getBloggerPosts, getBloggerUserBlogs, getBloggerInfo } from '../api'

const { Text, Title, Paragraph } = Typography
const { Option } = Select

interface BlogInfo {
  id: string
  name: string
  description: string
  url: string
  posts: {
    totalItems: number
  }
}

interface BlogPost {
  id: string
  title: string
  content: string
  url: string
  published: string
  updated: string
  author: {
    displayName: string
  }
  labels?: string[]
  status: string
}

const BloggerViewer: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [blogs, setBlogs] = useState<BlogInfo[]>([])
  const [selectedBlogId, setSelectedBlogId] = useState<string>('')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [blogUrl, setBlogUrl] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  useEffect(() => {
    loadUserBlogs()
  }, [])

  const loadUserBlogs = async () => {
    if (!clientSecret.trim()) {
      return
    }

    setLoading(true)
    try {
      const accessToken = await getValidAccessToken(clientSecret)
      if (!accessToken) {
        message.error('유효한 액세스 토큰이 없습니다. Google 계정을 다시 연동해주세요.')
        return
      }

      const response = await getBloggerUserBlogs(accessToken)
      const blogList = response.data.blogs?.items || []
      setBlogs(blogList)

      if (blogList.length > 0) {
        setSelectedBlogId(blogList[0].id)
      }
    } catch (error: any) {
      console.error('블로그 목록 조회 오류:', error)
      message.error('블로그 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadBlogPosts = async (blogId?: string) => {
    const targetBlogId = blogId || selectedBlogId
    if (!targetBlogId || !clientSecret.trim()) {
      return
    }

    setLoading(true)
    try {
      const accessToken = await getValidAccessToken(clientSecret)
      if (!accessToken) {
        message.error('유효한 액세스 토큰이 없습니다.')
        return
      }

      const response = await getBloggerPosts({
        blogId: targetBlogId,
        accessToken,
        maxResults: 10,
        status: 'live',
      })

      const postList = response.data.posts?.items || []
      setPosts(postList)
      message.success(`게시물 ${postList.length}개를 불러왔습니다.`)
    } catch (error: any) {
      console.error('게시물 조회 오류:', error)
      message.error('게시물을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadBlogByUrl = async () => {
    if (!blogUrl.trim() || !clientSecret.trim()) {
      message.error('블로그 URL과 Client Secret을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const accessToken = await getValidAccessToken(clientSecret)
      if (!accessToken) {
        message.error('유효한 액세스 토큰이 없습니다.')
        return
      }

      const response = await getBloggerInfo(blogUrl, accessToken)
      const blog = response.data.blog

      if (blog) {
        setBlogs(prev => {
          const exists = prev.find(b => b.id === blog.id)
          if (exists) return prev
          return [...prev, blog]
        })
        setSelectedBlogId(blog.id)
        message.success(`블로그를 찾았습니다: ${blog.name}`)

        // 자동으로 게시물 로드
        loadBlogPosts(blog.id)
      }
    } catch (error: any) {
      console.error('블로그 조회 오류:', error)
      message.error('블로그를 찾을 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const openPost = (url: string) => {
    if ((window as any).electron?.shell?.openExternal) {
      ;(window as any).electron.shell.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  return (
    <Card title="Blogger 게시물 조회" style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Client Secret 입력 */}
        <div>
          <Text strong>Client Secret:</Text>
          <Input.Password
            placeholder="Google OAuth2 Client Secret"
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>

        {/* 블로그 URL로 추가 */}
        <div>
          <Text strong>블로그 URL로 추가:</Text>
          <Space.Compact style={{ marginTop: 8, width: '100%' }}>
            <Input
              placeholder="https://example.blogspot.com"
              value={blogUrl}
              onChange={e => setBlogUrl(e.target.value)}
            />
            <Button type="primary" onClick={loadBlogByUrl} loading={loading}>
              추가
            </Button>
          </Space.Compact>
        </div>

        {/* 블로그 선택 */}
        <div>
          <Space>
            <Text strong>블로그 선택:</Text>
            <Select
              style={{ width: 300 }}
              placeholder="블로그를 선택하세요"
              value={selectedBlogId}
              onChange={setSelectedBlogId}
              loading={loading}
            >
              {blogs.map(blog => (
                <Option key={blog.id} value={blog.id}>
                  {blog.name} ({blog.posts?.totalItems || 0}개 게시물)
                </Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={() => loadUserBlogs()} loading={loading}>
              새로고침
            </Button>
            <Button type="primary" onClick={() => loadBlogPosts()} disabled={!selectedBlogId} loading={loading}>
              게시물 불러오기
            </Button>
          </Space>
        </div>

        {/* 게시물 목록 */}
        {posts.length > 0 && (
          <div>
            <Title level={5}>게시물 목록 ({posts.length}개)</Title>
            <List
              itemLayout="vertical"
              dataSource={posts}
              renderItem={post => (
                <List.Item
                  actions={[
                    <Button type="link" icon={<EyeOutlined />} onClick={() => openPost(post.url)}>
                      보기
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{post.title}</Text>
                        <Tag color="blue">{post.status}</Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <Text type="secondary">
                          작성자: {post.author.displayName} | 발행: {new Date(post.published).toLocaleString()}
                        </Text>
                        {post.labels && post.labels.length > 0 && (
                          <div>
                            {post.labels.map(label => (
                              <Tag key={label}>{label}</Tag>
                            ))}
                          </div>
                        )}
                      </Space>
                    }
                  />
                  <Paragraph ellipsis={{ rows: 2, expandable: false }} style={{ marginTop: 8 }}>
                    {stripHtml(post.content)}
                  </Paragraph>
                </List.Item>
              )}
            />
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        )}
      </Space>
    </Card>
  )
}

export default BloggerViewer
