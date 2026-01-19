import React, { useEffect, useState } from 'react';
import { Table, Button, Row, Col, Container } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { PencilSquare, Trash, Plus } from 'react-bootstrap-icons';
import API from '../utils/api.js';
import swal from 'sweetalert';

const productlistScreen = () => {
    const [products, setProducts] = useState([]);

    const fetchProducts = async () => {
        const { data } = await API.get('/api/products');
        setProducts(data);
    };

    useEffect(() => { fetchProducts(); }, []);

    const deleteHandler = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await API.delete(`/api/products/${id}`);
                swal("Deleted!", "Product has been removed.", "success");
                fetchProducts();
            } catch (err) {
                swal("Error", "Failed to delete product", "error");
            }
        }
    };

    const createProductHandler = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            const { data } = await API.post(`/api/products`, {}
            window.location.href = `/admin/product/${data._id}/edit`;
        } catch (err) {
            swal("Error", "Could not create product", "error");
        }
    };

    return (
        <Container className="py-5">
            <Row className="align-items-center mb-4">
                <Col>
                    <h2 className="fw-bold">Products</h2>
                </Col>
                <Col className="text-end">
                    <Button variant="dark" className="rounded-pill px-4" onClick={createProductHandler}>
                        <Plus size={25} /> Create Product
                    </Button>
                </Col>
            </Row>

            <Table hover responsive className="shadow-sm border rounded-3 align-middle">
                <thead className="bg-light">
                    <tr>
                        <th>ID</th>
                        <th>NAME</th>
                        <th>PRICE</th>
                        <th>CATEGORY</th>
                        <th>BRAND</th>
                        <th className="text-center">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <tr key={product._id}>
                            <td className="text-muted small">{product._id.substring(0, 10)}...</td>
                            <td className="fw-bold">{product.name}</td>
                            <td>${product.price}</td>
                            <td>{product.category}</td>
                            <td>{product.brand}</td>
                            <td className="text-center">
                                <LinkContainer to={`/admin/product/${product._id}/edit`}>
                                    <Button variant="light" size="sm" className="me-2 rounded-circle">
                                        <PencilSquare className="text-primary" />
                                    </Button>
                                </LinkContainer>
                                <Button 
                                    variant="light" 
                                    size="sm" 
                                    className="rounded-circle"
                                    onClick={() => deleteHandler(product._id)}
                                >
                                    <Trash className="text-danger" />
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
};

export default productlistScreen;