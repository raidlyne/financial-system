import React from 'react';
import { Layout as AntLayout, Menu, Button, Flex } from 'antd';
import {BarChartOutlined, ShoppingCartOutlined, UserOutlined, WalletOutlined} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';

const { Header, Content, Footer } = AntLayout;


const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();


    const menuItems = [
        {
            key: '/budgets',
            icon: <WalletOutlined />,
            label: <Link to="/budgets">Бюджеты</Link>,
        },
        {
            key: '/',
            icon: <ShoppingCartOutlined />,
            label: <Link to="/">Траты</Link>,
        },
        {
            key: '/statistics',
            icon: <BarChartOutlined />,
            label: <Link to="/statistics">Статистика</Link>,
        },
        {
            key: '/me',
            icon: <UserOutlined />,
            label: <Link to="/me">Профиль</Link>,
        },
    ];

    return (
        <AntLayout style={{ minHeight: '100vh' }}>
            <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>

                <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', minWidth: 100 }}>
                    ERP FinTech
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Menu
                        theme="dark"
                        mode="horizontal"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        style={{ borderBottom: 'none', background: 'transparent' }}
                    />
                </div>

                <div style={{ minWidth: 100, display: 'flex', justifyContent: 'flex-end' }}>
                    {user ? (
                        <Flex align="center" gap="small">
                            <Link to="/me">
                                {user}
                            </Link>
                        </Flex>
                    ) : (
                        <Button type="primary" onClick={() => navigate('/sign-in')}>
                            Вход
                        </Button>
                    )}
                </div>
            </Header>

            <Content style={{ padding: '24px', minHeight: 'calc(100vh - 134px)' }}>
                {children}
            </Content>

            <Footer style={{ textAlign: 'center' }}>
                @ERP FinTech 2026
            </Footer>
        </AntLayout>
    );
};

export default AppLayout;